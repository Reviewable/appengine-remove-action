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
# appengine-remove-action

This action removes versions of your deployed app to [App Engine][gae] that go beyond the set limit
and makes the number of versions and version numbers available to later build steps via outputs. This allows you to parameterize your App Engine removals.

## Usage

```yaml
steps:
- id: deploy
  uses: GoogleCloudPlatform/github-actions/appengine-deploy@master
  with:
    credentials: ${{ secrets.gcp_credentials }}

# Example of using the output
- id: test
  run: curl "${{ steps.deploy.outputs.url }}"
```
