import {Body, Controller, Get, HttpException, HttpStatus, Put, Session} from '@nestjs/common';
import {UserDbi} from '@server/db/user-dbi.service';
import {newDefaultUserSettings, newDefaultUserSongSettings, User, UserSettings, UserSongSettings} from '@common/user-model';
import {LoginResponse, UpdateFavoriteSongKeyRequest} from '@common/ajax-model';
import {conformsTo, validate} from 'typed-validation';
import {UpdateFavoriteSongKeyValidator, UserSongSettingsValidator} from '@server/util/validators';
import {ServerAuthService} from '@server/service/server-auth.service';
import {isEqualByStringify} from '@common/util/misc-utils';

@Controller('/api/user')
export class UserController {

  constructor(private readonly userDbi: UserDbi) {
  }

  /** Login callback. Called on successful user login. */
  @Get('/login')
  async login(@Session() session): Promise<LoginResponse> {
    const user = ServerAuthService.getUserOrUndefined(session);
    if (!user) {
      return {
        user: undefined,
        settings: newDefaultUserSettings(),
      };
    }
    console.log(`UserController.login: user is logged in: ${user.email}`);
    await this.userDbi.updateOnLogin(user);
    const settings = await this.getUserSettings(user);
    return {
      user,
      settings,
    };
  }

  @Get('/settings')
  async getSettings(@Session() session): Promise<UserSettings> {
    const user: User = ServerAuthService.getUserOrFail(session);
    console.log('UserController.getSettings', user.email);
    return await this.getUserSettings(user);
  }

  @Put('/settings/song')
  async setSongSettings(@Session() session, @Body() songSettings: UserSongSettings): Promise<UserSettings> {
    const vr = validate(songSettings, conformsTo(UserSongSettingsValidator));
    if (!vr.success) {
      throw new HttpException(vr.toString(), HttpStatus.BAD_REQUEST);
    }
    const user: User = ServerAuthService.getUserOrFail(session);
    console.log('UserController.setSongSettings', user.email, songSettings);
    const settings = await this.getUserSettings(user);
    const defaultSettings = newDefaultUserSongSettings(songSettings.songId);
    const sameAsDefault = isEqualByStringify(defaultSettings, songSettings);
    const updatedSettings = {...settings};
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
    const user: User = ServerAuthService.getUserOrFail(session);
    console.log('UserController.setH4Si', user.email, h4SiFlag);
    const settings = await this.getUserSettings(user);
    const updatedSettings = {...settings, h4Si: !!h4SiFlag};
    await this.userDbi.updateSettings(user.id, updatedSettings);
    return updatedSettings;
  }

  @Put('/settings/favKey')
  async setFavKey(@Session() session, @Body() request: UpdateFavoriteSongKeyRequest): Promise<UserSettings> {
    validate(request, conformsTo(UpdateFavoriteSongKeyValidator));
    const user: User = ServerAuthService.getUserOrFail(session);
    console.log('UserController.setFavKey', user.email, request);
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
}
