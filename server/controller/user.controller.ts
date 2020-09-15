import {Body, Controller, Get, HttpException, HttpStatus, Logger, Put, Res, Session} from '@nestjs/common';
import {UserDbi} from '@server/db/user-dbi.service';
import {newDefaultUserSettings, newDefaultUserSongSettings, User, UserSettings, UserSongSettings} from '@common/user-model';
import {LoginResponse, TabiusAjaxResponse, UpdateFavoriteSongKeyRequest} from '@common/ajax-model';
import {conformsTo, validate} from 'typed-validation';
import {UpdateFavoriteSongKeyValidator, UserSongSettingsValidator} from '@server/util/validators';
import {ServerSsoService} from '@server/service/server-sso.service';
import {Response} from 'express';
import {isEqualByStringify} from '@common/util/misc-utils';

@Controller('/api/user')
export class UserController {

  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userDbi: UserDbi,
              private ssoService: ServerSsoService,
  ) {
  }

  /** Login callback. Called on successful user login. */
  @Get('/login')
  async login(@Session() session): Promise<LoginResponse> {
    const user = ServerSsoService.getUserOrUndefined(session);
    if (!user) {
      return {
        user: undefined,
        settings: newDefaultUserSettings(),
      };
    }
    this.logger.log(`User is logged in: ${user.email}`);
    await this.userDbi.updateOnLogin(user);
    const settings = await this.getUserSettings(user);
    return {
      user,
      settings,
    };
  }

  @Get('/logout')
  async logout(@Res() response: Response, @Session() session): Promise<void> {
    this.logger.log('/logout ' + JSON.stringify(ServerSsoService.getUserOrUndefined(session)));
    this.ssoService.logout(response);
    response.status(HttpStatus.OK).send();
  }

  @Get('/settings')
  async getSettings(@Session() session): Promise<UserSettings> {
    const user: User = ServerSsoService.getUserOrFail(session);
    this.logger.log(`get settings: ${user.email}`);
    return await this.getUserSettings(user);
  }

  @Put('/settings/song')
  async setSettings(@Session() session, @Body() songSettings: UserSongSettings): Promise<UserSettings> {
    const vr = validate(songSettings, conformsTo(UserSongSettingsValidator));
    if (!vr.success) {
      throw new HttpException(vr.toString(), HttpStatus.BAD_REQUEST);
    }
    const user: User = ServerSsoService.getUserOrFail(session);
    this.logger.log(`set settings: ${user.email}, song: ${songSettings.songId}`);
    const settings = await this.getUserSettings(user);
    const defaultSettings = newDefaultUserSongSettings(songSettings.songId);
    const sameAsDefault = isEqualByStringify(defaultSettings, songSettings);
    const updatedSettings = {...settings} as any;
    if (sameAsDefault) {
      delete updatedSettings.songs[songSettings.songId];
    } else {
      updatedSettings.songs[songSettings.songId] = songSettings;
    }
    await this.userDbi.updateSettings(user.id, updatedSettings);
    return updatedSettings;
  }

  @Put('/settings/h4Si')
  async setH4Si(@Session() session, @Body() {h4SiFlag}: { h4SiFlag: boolean|undefined }): Promise<UserSettings> {
    const user: User = ServerSsoService.getUserOrFail(session);
    this.logger.log(`set h4Si: ${user.email}: ${h4SiFlag}`);
    const settings = await this.getUserSettings(user);
    const updatedSettings = {...settings, h4Si: !!h4SiFlag};
    await this.userDbi.updateSettings(user.id, updatedSettings);
    return updatedSettings;
  }

  @Put('/settings/favKey')
  async setFavKey(@Session() session, @Body() request: UpdateFavoriteSongKeyRequest): Promise<UserSettings> {
    validate(request, conformsTo(UpdateFavoriteSongKeyValidator));
    const user: User = ServerSsoService.getUserOrFail(session);
    this.logger.log(`set favKey: ${user.email}: ${request.key}`);
    const settings = await this.getUserSettings(user);
    const updatedSettings = {...settings, favKey: request.key};
    await this.userDbi.updateSettings(user.id, updatedSettings);
    return updatedSettings;
  }

  private async getUserSettings(user: User): Promise<UserSettings> {
    const settings = await this.userDbi.getSettings(user.id);
    if (settings === undefined) {
      throw new HttpException(`Settings not found! User: ${user.email}, id: ${user.id}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const defaultSettings = newDefaultUserSettings();
    return settings == null ? defaultSettings : {...defaultSettings, ...settings};
  }

  @Get('/sync')
  async sync(): Promise<TabiusAjaxResponse> {
    return {}; // sso interceptor will append session info to this response.
  }
}
