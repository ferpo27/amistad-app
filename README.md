# Amistad App

## Description
A friendly social matching application built with Expo and TypeScript.

## Setup
```bash
# Install dependencies
npm install

# Start the development server
npx expo start
```

## Scripts
- `npm run lint` – Lint the project.
- `npm run test` – Run the test suite.
- `npm run build` – Build the production bundle.
- `./scripts/type-check.sh "<commit-message>"` – Run TypeScript type checking and automatically commit if no errors are found.

## TypeScript Check
To verify TypeScript types and automatically commit when there are no errors, run the following command:

```bash
./scripts/type-check.sh "Your commit message"
```

The script performs the following steps:
1. Executes `tsc --noEmit` to type‑check the entire project.
2. If **no TypeScript errors** are reported, it stages all changes, creates a commit using the provided message, and pushes the commit to the current branch.
3. If **any TypeScript errors** are detected, the script aborts, prints the errors to the console, and **does not** create a commit.

### Parameters
- **Commit message** (required): The message that will be used for the automatic commit when the type check passes.

### Example
```bash
./scripts/type-check.sh "chore: type check passed"
```

> **Note:** Ensure that your working tree is clean (no uncommitted changes) and that you have the necessary Git permissions before running the script.

## Contributing
Please read the [CONTRIBUTING.md](CONTRIBUTING.md) guidelines before submitting pull requests.

## License
This project is licensed under the MIT License.