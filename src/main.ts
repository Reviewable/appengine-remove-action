import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as toolCache from '@actions/tool-cache';
import path from 'path';
import {
  authenticateGcloudSDK,
  getLatestGcloudSDKVersion,
  getToolCommand,
  installGcloudSDK,
  isAuthenticated,
  isInstalled,
  isProjectIdSet,
  setProject,
} from '@google-github-actions/setup-cloud-sdk';

async function run(): Promise<void> {
  try {
    // Get action inputs.
    const projectId = core.getInput('project_id');
    const limit = Number(core.getInput('limit'));
    const applyLimitAfterDays = Number(core.getInput('apply_limit_after_days'));
    const serviceAccountKey = core.getInput('credentials');
    const serviceName = core.getInput('service_name');

    // Authenticate - this comes from google-github-actions/auth
    const credFile = process.env.GOOGLE_GHA_CREDS_PATH;
    if (credFile) {
      await authenticateGcloudSDK(credFile);
      core.info('Successfully authenticated');
    } else {
      core.warning(
        'No authentication found for gcloud, authenticate with `google-github-actions/auth`.',
      );
    }

    // Install gcloud if not already installed.
    const version = await getLatestGcloudSDKVersion();
    if (!isInstalled(version)) {
      await installGcloudSDK(version);
    } else {
      const toolPath = toolCache.find('gcloud', version);
      core.addPath(path.join(toolPath, 'bin'));
    }

    // Fail if no Project Id is provided if not already set.
    const projectIdSet = await isProjectIdSet();
    if (!projectIdSet && projectId === '') {
      core.setFailed('No project Id provided.');
    }

    // Authenticate gcloud SDK.
    if (serviceAccountKey) {
      await authenticateGcloudSDK(serviceAccountKey);
    }
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      core.setFailed('Error authenticating the Cloud SDK.');
    }

    // Set the project ID, if given.
    if (projectId) {
      await setProject(projectId);
      core.info('Successfully set default project');
    }

    const toolCommand = getToolCommand();

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

    //Apply apply_limit_after_days
    if (applyLimitAfterDays && applyLimitAfterDays > 0) {
      const dateDiff = new Date().getDate() - applyLimitAfterDays;
      const deleteBefore = new Date(new Date().setDate(dateDiff));
      const deleteBeforeString = deleteBefore.toISOString().split('T')[0];
      appVersionCmd.push(
        '--filter',
        `version.createTime.date('%Y-%m-%d', Z)<'${deleteBeforeString}'`,
      );
    }

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
      // Wait a couple seconds to try to avoid GAE's bogus resource conflict errors.
      await new Promise(r => setTimeout(r, 2000));

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
        appDeleteCmd.push('--service', serviceName);
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
