import {Body, Controller, Get, Logger, Put, Session, UseGuards} from '@nestjs/common';
import {UserDbi} from '@server/db/user-dbi.service';
import {ServerAuthGuard} from '@server/util/server-auth.guard';
import {newDefaultUserSettings, User, UserSettings, UserSongSettings} from '@common/user-model';
import {LoginResponse} from '@common/ajax-model';
import {PlaylistDbi} from '@server/db/playlist-dbi.service';

//TODO: validate params for all methods!
@UseGuards(ServerAuthGuard)
@Controller('/api/user')
export class UserController {

  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userDbi: UserDbi, private readonly playlistDbi: PlaylistDbi) {
  }

  /** Login callback. Called on successful user login. */
  @Get('/login')
  async login(@Session() session): Promise<LoginResponse> {
    const user: User = ServerAuthGuard.getUserOrFail(session);
    this.logger.log(`User is logged in: ${user.email}`);
    await this.userDbi.updateOnLogin(user);
    const [settings, playlists] = await Promise.all([this._getUserSettings(user), this.playlistDbi.getPlaylists(user.id)]);
    return {
      settings,
      playlists
    };
  }

  @Get('/settings')
  getSettings(@Session() session): Promise<UserSettings> {
    const user: User = ServerAuthGuard.getUserOrFail(session);
    this.logger.log(`get settings: ${user.email}`);
    return this._getUserSettings(user);
  }

  @Put('/settings/song')
  async setSettings(@Session() session, @Body() songSettings: UserSongSettings): Promise<UserSettings> {
    const user: User = ServerAuthGuard.getUserOrFail(session);
    this.logger.log(`set settings: ${user.email} for song: ${songSettings.songId}`);
    const settings = await this._getUserSettings(user);
    settings.songs[songSettings.songId] = songSettings;
    await this.userDbi.updateUserSettings(user.id, settings);
    return settings;
  }

  @Put('/settings/b4Si')
  async setB4Si(@Session() session, @Body() {b4SiFlag}: { b4SiFlag: boolean|undefined }): Promise<UserSettings> {
    const user: User = ServerAuthGuard.getUserOrFail(session);
    this.logger.log(`set b4Si: ${user.email}: ${b4SiFlag}`);
    const settings = await this._getUserSettings(user);
    settings.b4Si = !!b4SiFlag;
    await this.userDbi.updateUserSettings(user.id, settings);
    return settings;
  }

  //todo: move to dbi?
  private async _getUserSettings(user: User): Promise<UserSettings> {
    const settings = await this.userDbi.getSettings(user.id);
    if (settings === undefined) {
      throw new Error(`Settings not found! User: ${user.email}, id: ${user.id}`);
    }
    return settings == null ? newDefaultUserSettings() : settings;
  }
}
