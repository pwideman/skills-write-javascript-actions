const getJoke = require('./joke');
const core = require('@actions/core');
const github = require('@actions/github');
const { GitHub, getOctokitOptions } = require('@actions/github/lib/utils');
//const { Octokit } = require('@octokit/rest');
const { throttling } = require('@octokit/plugin-throttling');
const { retry } = require('@octokit/plugin-retry');

const MyOctokit = GitHub.plugin(throttling, retry);
const token = core.getInput('token');
const octokit = new MyOctokit(getOctokitOptions(token, {
    throttle: {
        onRateLimit: (retryAfter, options) => {
            octokit.log.warn(
                `Request quota exhausted for request ${options.method} ${options.url}`,
            );

            // Retry twice after hitting a rate limit error, then give up
            if (options.request.retryCount <= 2) {
                console.log(`Retrying after ${retryAfter} seconds!`);
                return true;
            }
        },
        onSecondaryRateLimit: (retryAfter, options, octokit) => {
            // does not retry, only logs a warning
            octokit.log.warn(
                `Secondary quota detected for request ${options.method} ${options.url}`,
            );
        },
    },
}));

async function run() {
    const joke = await getJoke();
    console.log(joke);
    core.setOutput('joke-output', joke);
    const issue = github.context.issue;
    octokit.rest.issues.createComment({owner: issue.owner, repo: issue.repo, issue_number: issue.number, body: joke});
}

run();