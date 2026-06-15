# Contributing Guidelines

🎉 Thanks for taking the time to contribute! 🎉

Before submitting your contribution, please make sure to take a moment and read through the following guidelines:

- [Code of Conduct](CODE_OF_CONDUCT.md)
- [AI/LLM Contributions Policy](#aillm-contributions-policy)

## AI/LLM Contributions Policy

AI tools can be pretty helpful for coding tasks, and we're not here to gatekeep how you get your work done.
But here's the thing—this project is maintained by volunteers who do this in their spare time.
We want to make sure we're spending our limited time effectively.

If you used AI tools meaningfully in your contribution (code generation, agentic coding assistants, etc.), please mention it in your PR description.
Basic autocomplete doesn't count, but if an AI wrote substantial parts of your code, just let us know.

**Examples of good disclosure:**

- "Used Claude Code to generate the unit tests for this feature."
- "Used GitHub Copilot to help write the initial implementation of this function."

Here's what we're looking for:

- **You understand your code**: You should be able to explain what your contribution does and how it works.
  We want to collaborate with humans who are invested in the project.
- **Context matters**: Tell us what problem you're solving, how you tested it, and link to relevant docs.
  Small, incremental changes work better than massive generated overhauls.
- **Quality over quantity**: We'd rather have one thoughtful, well-tested contribution than ten AI-generated PRs that need extensive review.

As always, we reserve the right to decline any contribution.
Any submission that is in violation of this policy will be closed, and the submitter may be blocked from this repository without warning.

## Project Overview

Upload Anki Add-on is a [JavaScript action](https://docs.github.com/en/actions/tutorials/create-actions/create-a-javascript-action) but built using TypeScript.

### How to build this project

1. [Fork](https://github.com/danny900714/upload-anki-addon/fork) and clone the repository
2. Install dependencies with `pnpm install`.
3. Generate the TypeScript code from Protocol Buffers schema located at `./proto` using the command `pnpm generate`.
4. Build the project using `pnpm build`. This will compile the TypeScript code and bundle all dependencies it uses to `dist/index.js`.
