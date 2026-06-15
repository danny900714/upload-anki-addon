# Upload Anki Add-on

[![CI](https://github.com/danny900714/upload-anki-addon/actions/workflows/ci.yml/badge.svg)](https://github.com/danny900714/upload-anki-addon/actions/workflows/ci.yml)

A GitHub Action for uploading an Anki add-on to AnkiWeb.

## Features

- **Multiple branches**: Upload different add-on files targeting different Anki version ranges.
- **Description file**: Use a separate file for the add-on description, making it easier to edit and format.

## Usage

### Upload a new add-on to AnkiWeb

If `addon-id` is not provided, a new add-on will be created on AnkiWeb.

Specify the Anki versions your add-on supports using the `branches` parameter.
Use the `+` symbol for the max version to indicate that your add-on supports all future versions as well.

```yaml
name: Release

on:
  release:
    types: [published]

permissions:
  contents: read

jobs:
  upload-addon:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v6
      - name: Package add-on
        run: cd src/my-addon && zip -r ../../my-addon.ankiaddon *
      - name: Upload add-on to AnkiWeb
        uses: danny900714/upload-anki-addon@v0
        with:
          username: ${{ vars.ANKIWEB_USERNAME }}
          password: ${{ secrets.ANKIWEB_PASSWORD }}
          title: My Anki add-on
          description: Description for my Anki add-on
          branches: 2.1.1-25.09.4+
          addon-files: my-addon.ankiaddon
```

### Using a description file

You can use a separate file for the add-on description, which makes it easier to edit and format.
Note that `description` takes precedence over `description-file` if both are provided.

```yaml
name: Release

on:
  release:
    types: [published]

permissions:
  contents: read

jobs:
  upload-addon:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v6
      - name: Package add-on
        run: cd src/my-addon && zip -r ../../my-addon.ankiaddon *
      - name: Upload add-on to AnkiWeb
        uses: danny900714/upload-anki-addon@v0
        with:
          username: ${{ vars.ANKIWEB_USERNAME }}
          password: ${{ secrets.ANKIWEB_PASSWORD }}
          addon-id: 12345678
          title: My Anki add-on
          description-file: README.md
          branches: 2.1.1-25.09.4+
          addon-files: my-addon.ankiaddon
```

### Multiple branches

You can target multiple Anki version ranges by specifying multiple branches, one per line.
The number of `addon-files` must match the number of `branches`.

```yaml
name: Release

on:
  release:
    types: [published]

permissions:
  contents: read

jobs:
  upload-addon:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v6
      - name: Package add-on for first branch
        run: cd src/first-branch && zip -r ../../first-branch.ankiaddon *
      - name: Package add-on for second branch
        run: cd src/second-branch && zip -r ../../second-branch.ankiaddon *
      - name: Upload add-on to AnkiWeb
        uses: danny900714/upload-anki-addon@v0
        with:
          username: ${{ vars.ANKIWEB_USERNAME }}
          password: ${{ secrets.ANKIWEB_PASSWORD }}
          addon-id: 12345678
          title: My Anki add-on
          description: Description for my Anki add-on
          branches: |
            2.1.1-2.1.66
            23.10-25.09.4+
          addon-files: |
            first-branch.ankiaddon
            second-branch.ankiaddon
```

## Customizing

### Inputs

The following inputs can be used as `step.with` keys:

> `List` type is a newline-delimited string
>
> ```yaml
> branches: |
>   2.1.1-2.1.66
>   23.10-25.09.4+
> ```

| Name               | Type   | Required | Description                                                                                                                                                                                                               |
| ------------------ | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `username`         | String | true     | AnkiWeb username.                                                                                                                                                                                                         |
| `password`         | String | true     | AnkiWeb password.                                                                                                                                                                                                         |
| `addon-id`         | String | false    | The download code for the add-on. Omit this when uploading a new add-on.                                                                                                                                                  |
| `title`            | String | true     | The title of the add-on. Must be fewer than 80 characters.                                                                                                                                                                |
| `tags`             | String | false    | Space-separated tags for this add-on.                                                                                                                                                                                     |
| `support-page`     | String | false    | A bug tracker, forum link, or other page where users can reach you. Must start with http.                                                                                                                                 |
| `branches`         | List   | true     | A list of Anki version branches that your add-on supports. Each branch must be in the format `min-max`, where `min` and `max` are Anki versions. Use `+` for the max version to indicate support for all future versions. |
| `addon-files`      | List   | true     | A list of add-on files to upload, in the same order as `branches`. Use `-` to skip updating the add-on file for a branch.                                                                                                 |
| `description`      | String | false    | The description of the add-on. Markdown and basic HTML are supported.                                                                                                                                                     |
| `description-file` | String | false    | Path to a file containing the add-on description. Markdown and basic HTML are supported. Ignored if `description` is also provided.                                                                                       |

> [!NOTE]
>
> - `description` takes precedence over `description-file` if both are provided.
> - The number of `addon-files` must match the number of `branches`.

### Outputs

The following outputs can be accessed via `${{ steps.<step-id>.outputs }}`:

| Name       | Type   | Description                          |
| ---------- | ------ | ------------------------------------ |
| `addon-id` | String | The id for the uploaded Anki add-on. |
