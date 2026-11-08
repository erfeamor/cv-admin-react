"""Structural guard for .github/workflows/ci.yml and the Drone removal (T-305).

Run: python3 -m unittest discover -s scripts/tests -v   (needs PyYAML)
"""
import pathlib
import unittest

import yaml

ROOT = pathlib.Path(__file__).resolve().parents[2]
WFDIR = ROOT / ".github" / "workflows"


def load(name):
    text = (WFDIR / name).read_text()
    wf = yaml.safe_load(text)
    wf["_on"] = wf.get("on", wf.get(True))  # YAML 1.1 parses `on` as True
    return text, wf


def runs(job):
    return [s.get("run", "") for s in job["steps"]]


def find_step(job, needle):
    for s in job["steps"]:
        if needle in s.get("run", ""):
            return s
    raise AssertionError(f"no step running {needle!r}")


def keys(node):
    if isinstance(node, dict):
        for k, v in node.items():
            yield k
            yield from keys(v)
    elif isinstance(node, list):
        for v in node:
            yield from keys(v)


class CI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text, cls.wf = load("ci.yml")
        cls.test = cls.wf["jobs"]["test"]
        cls.deploy = cls.wf["jobs"]["deploy"]

    def test_triggers(self):
        on = self.wf["_on"]
        self.assertEqual(set(on), {"push", "pull_request"})
        self.assertEqual(on["push"]["branches"], ["master"])
        self.assertEqual(on["pull_request"]["branches"], ["master"])

    def test_top_level_permissions_read_only(self):
        self.assertEqual(self.wf["permissions"], {"contents": "read"})

    def test_pr_concurrency_cancels_but_master_does_not(self):
        c = self.wf["concurrency"]
        self.assertIn("github.ref", c["group"])
        self.assertIn("pull_request", str(c["cancel-in-progress"]))

    def test_test_job_basics(self):
        self.assertEqual(self.test["runs-on"], "ubuntu-latest")
        self.assertEqual(self.test["timeout-minutes"], 20)
        node = next(s for s in self.test["steps"] if str(s.get("uses", "")).startswith("actions/setup-node@v4"))
        self.assertEqual(str(node["with"]["node-version"]), "22")
        self.assertEqual(node["with"]["cache"], "npm")

    def test_test_steps_in_order(self):
        cmds = [r.strip() for r in runs(self.test)]
        order = ["npm ci", "npm run lint", "npm run typecheck", "npm test", "npm run build"]
        idx = [cmds.index(c) for c in order]
        self.assertEqual(idx, sorted(idx))
        sb = next(i for i, c in enumerate(cmds) if c == "npm run build-storybook")
        self.assertGreater(sb, idx[-1])

    def test_build_env(self):
        env = next(s for s in self.test["steps"] if s.get("run", "").strip() == "npm run build")["env"]
        self.assertEqual(env["VITE_COGNITO_USER_POOL_ID"], "eu-west-3_0pjSduVeP")
        self.assertEqual(env["VITE_COGNITO_CLIENT_ID"], "9pd7rt69u0072dtg0lbjpqq0q")
        self.assertEqual(
            env["VITE_COGNITO_HOSTED_UI_DOMAIN"], "cv-project-dev.auth.eu-west-3.amazoncognito.com"
        )
        self.assertIn("VITE_DOMAIN_SERVICE_URL", env)
        self.assertEqual(env["VITE_DOMAIN_SERVICE_URL"], "")

    def test_localhost_guard_in_both_jobs(self):
        for job in (self.test, self.deploy):
            step = find_step(job, "localhost:8080")
            self.assertIn("grep -rn", step["run"])
            self.assertIn("dist/", step["run"])
            self.assertIn("exit 1", step["run"])

    def test_guard_runs_after_build(self):
        cmds = runs(self.test)
        b = next(i for i, r in enumerate(cmds) if r.strip() == "npm run build")
        g = next(i for i, r in enumerate(cmds) if "localhost:8080" in r)
        self.assertGreater(g, b)

    def test_structural_test_step(self):
        r = find_step(self.test, "unittest discover")["run"]
        self.assertIn("python3 -m unittest discover -s scripts/tests -v", r)
        self.assertIn("pip install --user pyyaml", r)

    def test_dist_artifact_one_day(self):
        up = next(s for s in self.test["steps"] if str(s.get("uses", "")).startswith("actions/upload-artifact@v4"))
        self.assertEqual(up["with"]["path"], "dist/")
        self.assertEqual(up["with"]["retention-days"], 1)

    def test_deploy_only_on_master_push(self):
        self.assertEqual(self.deploy["needs"], "test")
        self.assertEqual(
            self.deploy["if"], "github.event_name == 'push' && github.ref == 'refs/heads/master'"
        )

    def test_deploy_permissions(self):
        self.assertEqual(self.deploy["permissions"], {"id-token": "write", "contents": "read"})

    def test_no_environment_key_anywhere(self):
        self.assertNotIn("environment", set(keys(self.wf)))

    def test_deploy_concurrency(self):
        c = self.deploy["concurrency"]
        self.assertEqual(c["group"], "deploy-cv-admin-react")
        self.assertIs(c["cancel-in-progress"], False)

    def test_deploy_env(self):
        self.assertEqual(
            self.deploy["env"],
            {
                "AWS_REGION": "eu-west-3",
                "S3_BUCKET": "cv-project-frontend-dev",
                "CLOUDFRONT_DISTRIBUTION_ID": "E2AV0INGJW1UO2",
            },
        )

    def test_role_assumed_from_repo_variable(self):
        step = next(s for s in self.deploy["steps"] if str(s.get("uses", "")).startswith("aws-actions/configure-aws-credentials@v4"))
        self.assertEqual(step["with"]["role-to-assume"], "${{ vars.AWS_DEPLOY_ROLE_ARN }}")
        req = find_step(self.deploy, "ROLE_ARN")
        self.assertIn('[ -z "$ROLE_ARN" ]', req["run"])

    def sync_cmds(self):
        out = []
        for r in runs(self.deploy):
            if "aws s3 sync" in r:
                out.append(" ".join(r.split()))
        return out

    def test_two_sync_passes_into_admin_only(self):
        cmds = self.sync_cmds()
        self.assertEqual(len(cmds), 2)
        for c in cmds:
            self.assertIn('"s3://${S3_BUCKET}/admin/"', c)
            self.assertNotIn('"s3://${S3_BUCKET}/"', c)
            self.assertNotIn("s3://${S3_BUCKET} ", c)
            self.assertEqual(c.count("s3://"), 1)
        p1, p2 = cmds
        self.assertIn("--exclude index.html", p1)
        self.assertIn('--cache-control "public, max-age=31536000, immutable"', p1)
        self.assertNotIn("--delete", p1)
        self.assertIn("--delete", p2)
        self.assertIn('--cache-control "no-cache"', p2)

    def test_no_s3_reads_in_deploy(self):
        for r in runs(self.deploy):
            self.assertNotIn("s3 cp", r)
            self.assertNotIn("s3api get", r)
            self.assertNotIn("s3 ls", r)

    def test_invalidation_path_exact(self):
        cmds = [" ".join(r.split()) for r in runs(self.deploy) if "create-invalidation" in r]
        self.assertEqual(len(cmds), 1)
        self.assertIn('--paths "/admin/*"', cmds[0])
        self.assertTrue(cmds[0].endswith('--paths "/admin/*"'))
        self.assertIn('--distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}"', cmds[0])

    def test_order_sync_invalidate_smoke(self):
        r = runs(self.deploy)
        i1 = next(i for i, x in enumerate(r) if "--exclude index.html" in x)
        i2 = next(i for i, x in enumerate(r) if "--delete" in x)
        i3 = next(i for i, x in enumerate(r) if "create-invalidation" in x)
        i4 = next(i for i, x in enumerate(r) if "https://erfeamor.com/admin/" in x)
        self.assertLess(i1, i2)
        self.assertLess(i2, i3)
        self.assertLess(i3, i4)

    def test_smoke_step(self):
        r = find_step(self.deploy, "https://erfeamor.com/admin/")["run"]
        self.assertIn("curl -fsS --retry 6 --retry-delay 5 --retry-all-errors", r)
        self.assertIn("dist/assets", r)

    def test_no_untrusted_interpolation_in_run(self):
        for job in (self.test, self.deploy):
            for r in runs(job):
                self.assertNotIn("${{", r)

    def test_no_drone_or_jenkins_in_workflows(self):
        for p in WFDIR.glob("*"):
            low = p.read_text().lower()
            self.assertNotIn("drone", low, p.name)
            self.assertNotIn("jenkins", low, p.name)

    def test_drone_yml_removed(self):
        self.assertFalse((ROOT / ".drone.yml").exists())


if __name__ == "__main__":
    unittest.main()
