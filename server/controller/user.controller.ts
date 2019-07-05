import {Body, Controller, Get, Logger, Put, Session, UseGuards} from '@nestjs/common';
import {UserDbi} from '@server/db/user-dbi.service';
import {ServerAuthGuard} from '@server/util/server-auth.guard';
import {newDefaultUserSettings, User, UserSettings, UserSongSettings} from '@common/user-model';
import {LoginResponse} from '@common/ajax-model';
import {PlaylistDbi} from '@server/db/playlist-dbi.service';
import {conformsTo, validate} from 'typed-validation';
import {UserSongSettingsValidator, UserValidator} from '@server/util/validators';
import {ServerSsoService} from '@server/service/server-sso.service';

@UseGuards(ServerAuthGuard)
@Controller('/api/user')
export class UserController {

  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userDbi: UserDbi, private readonly playlistDbi: PlaylistDbi) {
  }

  /** Login callback. Called on successful user login. */
  @Get('/login')
  async login(@Session() session): Promise<LoginResponse> {
    const user = ServerSsoService.getUserOrUndefined(session);
    if (!user) {
      return {
        user: undefined,
        settings: newDefaultUserSettings(),
        playlists: []
      };
    }
    this.logger.log(`User is logged in: ${user.email}`);
    const vr = validate(user, conformsTo(UserValidator));
    if (!vr.success) {
      throw vr.toString();
    }
    await this.userDbi.updateOnLogin(user);
    const [settings, playlists] = await Promise.all([this._getUserSettings(user), this.playlistDbi.getPlaylists(user.id)]);
    return {
      user,
      settings,
      playlists
    };
  }

  @Get('/settings')
  getSettings(@Session() session): Promise<UserSettings> {
    const user: User = ServerSsoService.getUserOrFail(session);
    this.logger.log(`get settings: ${user.email}`);
    return this._getUserSettings(user);
  }

  @Put('/settings/song')
  async setSettings(@Session() session, @Body() songSettings: UserSongSettings): Promise<UserSettings> {
    const vr = validate(songSettings, conformsTo(UserSongSettingsValidator));
    if (!vr.success) {
      throw vr.toString();
    }
    const user: User = ServerSsoService.getUserOrFail(session);
    this.logger.log(`set settings: ${user.email} for song: ${songSettings.songId}`);
    const settings = await this._getUserSettings(user);
    settings.songs[songSettings.songId] = songSettings;
    await this.userDbi.updateSettings(user.id, settings);
    return settings;
  }

  @Put('/settings/b4Si')
  async setB4Si(@Session() session, @Body() {b4SiFlag}: { b4SiFlag: boolean|undefined }): Promise<UserSettings> {
    const user: User = ServerSsoService.getUserOrFail(session);
    this.logger.log(`set b4Si: ${user.email}: ${b4SiFlag}`);
    const settings = await this._getUserSettings(user);
    const updatedSettings = {...settings, b4Si: !!b4SiFlag};
    await this.userDbi.updateSettings(user.id, updatedSettings);
    return settings;
  }

  //todo: move to dbi?
  private async _getUserSettings(user: User): Promise<UserSettings> {
    const settings = await this.userDbi.getSettings(user.id);
    if (settings === undefined) {
      throw `Settings not found! User: ${user.email}, id: ${user.id}`;
    }
    return settings == null ? newDefaultUserSettings() : settings;
  }
}
