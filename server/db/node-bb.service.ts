import {Injectable, Logger} from '@nestjs/common';
import {isValidId} from '@common/util/misc-utils';
import {promisify} from 'util';

import {del} from 'request';
import {getConfigFilePath} from '@server/server-config';
import {readFileSync} from 'fs';

const [delAsync] = [del].map(promisify);

const nodeBBConfigAsString = readFileSync(getConfigFilePath('nodebb-config.json')).toString();
const nodeBBConfig: NodeBBConfig = JSON.parse(nodeBBConfigAsString) as NodeBBConfig;

interface NodeBBConfig {
  writeApi: {
    enable: boolean,
    url: string,
    token: string;
  }
}

const DEFAULT_OPTIONS = {
  json: true,
  headers: {
    Authorization: `Bearer ${nodeBBConfig.writeApi.token}`
  },
};

@Injectable()
export class NodeBBService {

  private readonly logger = new Logger(NodeBBService.name);

  async deleteTopic(topicId: number): Promise<void> {
    this.logger.debug(`Removing forum topic ${topicId}`);
    if (!isValidId(topicId)) {
      this.logger.error(`Invalid topic id: ${topicId}`);
      return;
    }
    if (!nodeBBConfig.writeApi.enable) {
      this.logger.debug('Write API is disabled.');
      return;
    }

    const response = await delAsync(`${nodeBBConfig.writeApi.url}/api/v2/topics/${topicId}`, DEFAULT_OPTIONS);
    this.logger.debug('Delete topic response: ', JSON.stringify(response));
  }

}
