/*
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as setupGcloud from 'setupGcloudSDK';

async function run(): Promise<void> {
  try {
    // Get action inputs.
    let projectId = core.getInput('project_id');
    const limit = Number(core.getInput('limit'));
    const serviceAccountKey = core.getInput('credentials');
    const serviceName = core.getInput('service_name');

    // Install gcloud if not already installed.
    if (!setupGcloud.isInstalled()) {
      const gcloudVersion = await setupGcloud.getLatestGcloudSDKVersion();
      await setupGcloud.installGcloudSDK(gcloudVersion);
    }

    // Fail if no Project Id is provided if not already set.
    const projectIdSet = await setupGcloud.isProjectIdSet();
    if (!projectIdSet && projectId === '' && serviceAccountKey === '') {
      core.setFailed('No project Id provided.');
    }

    // Authenticate gcloud SDK.
    if (serviceAccountKey) {
      await setupGcloud.authenticateGcloudSDK(serviceAccountKey);
      // Set and retrieve Project Id if not provided
      if (projectId === '') {
        projectId = await setupGcloud.setProjectWithKey(serviceAccountKey);
      }
    }
    const authenticated = await setupGcloud.isAuthenticated();
    if (!authenticated) {
      core.setFailed('Error authenticating the Cloud SDK.');
    }

    const toolCommand = setupGcloud.getToolCommand();

    // Get versions all versions
    const appVersionCmd = [
      'app',
      'versions',
      'list',
      '--filter',
      'traffic_split=0',
      '--format',
      'value(id)',
      '--sort-by',
      'last_deployed_time',
    ];

    const versions: string[] = [];
    const stdout = (data: Buffer): void => {
      versions.push(
        ...data
          .toString()
          .split(/\r?\n|\r/g)
          .filter((version) => version),
      );
    };

    // Get output of gcloud cmd.
    let err = '';
    const stderr = (data: Buffer): void => {
      err += data.toString();
    };

    const options = {
      listeners: {
        stderr,
        stdout,
      },
    };

    // Add gcloud flags.
    if (projectId !== '') {
      appVersionCmd.push('--project', projectId);
    }

    if (serviceName !== '') {
      appVersionCmd.push('--service', serviceName);
    }

    // Run gcloud versions list cmd
    await exec.exec(toolCommand, appVersionCmd, options);

    if (versions.length > limit) {
      const versionsToDelete = versions.slice(0, versions.length - limit);
  
      const appDeleteCmd = [
        'app',
        'versions',
        'delete',
        ...versionsToDelete,
        '--quiet',
      ];
  
      // Add gcloud flags.
      if (projectId !== '') {
        appDeleteCmd.push('--project', projectId);
      }
  
      if (serviceName !== '') {
        appVersionCmd.push('--service', serviceName);
      }
  
      core.debug(
        `Deleting ${
          versionsToDelete.length
        }, versions: Version ${versionsToDelete.join(' ')}`,
      );
      
      // // Run gcloud cmd.
      await exec.exec(toolCommand, appDeleteCmd, options);
      core.setOutput('versions_deleted', versionsToDelete.join(' '));
      core.setOutput('total_deleted', versionsToDelete.length);
    } else {
      core.debug('No versions to delete.');
      core.setOutput('versions_deleted', '');
      core.setOutput('total_deleted', '0');
    }

    core.debug(err);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
