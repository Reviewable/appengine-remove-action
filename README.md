<!--
Copyright 2020 Ideanest LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->
[gae]:  https://cloud.google.com/appengine
# appengine-remove-action

This action removes versions of your deployed app to [App Engine][gae] that go beyond the set limit
and makes the number of versions and version numbers available to later build steps via outputs. This allows you to parameterize your App Engine removals.

*Note:* The oldest versions that goes beyond your set limit will be deleted.

## Usage

```yaml
steps:
- id: remove
  uses: Reviewable/appengine-remove-action@v2
  with:
    limit: 5
    project_id: ${{ secrets.GCP_PROJECT_ID }}
    credentials: ${{ secrets.GCP_CREDENTIALS }}

# Example of using the output
- id: test
  run: |
    echo "${{ steps.remove.outputs.versions_deleted }}"
    echo "${{ steps.remove.total_deleted }}"
```

## Prerequisites

This action requires Google Cloud credentials that are authorized to delete an
App Engine Application version. See the Authorization section below for more information.

## Inputs

- `project_id`: (Optional) ID of the Google Cloud project. If provided, this
  will override the project configured by gcloud.

- `limit`: (required) The total number of the latest deployed versions to keep.

- `credentials`: (optional) The credentials to authorize connection to your
  project deployed to App Engine. If included the `google-github-actions/setup-gcloud@master`
  step prior to `appengine-remove-action`, those credentials will be accessed
  by default.

- `service_name:` (optional) The name of the service that you want to target. If provided, 
  this will only remove the versions related to the service.

## Outputs

- `versions_deleted`: An array of versions that were deleted.
- `total_deleted`: The total number of versions deleted.

## Authorization

There are a few ways to authenticate this action. The caller must have
permissions to access the secrets being requested.

Roles needed:

- App Engine roles:
  - Admin (`roles/appengine.appAdmin`): Can manage all App Engine resources (not recommended)
  - Deployer (`roles/appengine.deployer`): Can delete App Engine versions if it's not receiving any traffic (recommended)
