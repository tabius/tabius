import { Body, Controller, Get, HttpException, HttpStatus, Put, Req } from '@nestjs/common';
import { UserDbi } from '../db/user-dbi.service';
import { newDefaultUserSettings, newDefaultUserSongSettings, User, UserSettings, UserSongSettings } from '@common/user-model';
import { LoginResponse, UpdateFavoriteSongKeyRequest } from '@common/api-model';
import { updateFavoriteSongKeyRequestAssertion, UserSongSettingsValidator } from '../util/validators';
import { BackendAuthService } from '../service/backend-auth.service';
import { isEqualByStringify } from '@common/util/equality-functions';
import { validateObject } from 'assertic';

@Controller('/api/user')
export class UserController {
  constructor(private readonly userDbi: UserDbi) {}

  /** Login callback. Called on successful user login. */
  @Get('/login')
  async login(@Req() req): Promise<LoginResponse> {
    const user = BackendAuthService.getUserOrUndefined(req);
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
  async getSettings(@Req() req): Promise<UserSettings> {
    const user: User = BackendAuthService.getUserOrFail(req);
    console.log('UserController.getSettings', user.email);
    return await this.getUserSettings(user);
  }

  @Put('/settings/song')
  async setSongSettings(@Req() req, @Body() songSettings: UserSongSettings): Promise<UserSettings> {
    const error = validateObject(songSettings, UserSongSettingsValidator);
    if (error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    const user: User = BackendAuthService.getUserOrFail(req);
    console.log('UserController.setSongSettings', user.email, songSettings);
    const settings = await this.getUserSettings(user);
    const defaultSettings = newDefaultUserSongSettings(songSettings.songId);
    const sameAsDefault = isEqualByStringify(defaultSettings, songSettings);
    const updatedSettings = { ...settings };
    if (sameAsDefault) {
      delete updatedSettings.songs[songSettings.songId];
    } else {
      updatedSettings.songs[songSettings.songId] = songSettings;
    }
    await this.userDbi.updateSettings(user.id, updatedSettings);
    return updatedSettings;
  }

  @Put('/settings/h4Si')
  async setH4Si(@Req() req, @Body() { h4SiFlag }: { h4SiFlag: boolean | undefined }): Promise<UserSettings> {
    const user: User = BackendAuthService.getUserOrFail(req);
    console.log('UserController.setH4Si', user.email, h4SiFlag);
    const settings = await this.getUserSettings(user);
    const updatedSettings = { ...settings, h4Si: !!h4SiFlag };
    await this.userDbi.updateSettings(user.id, updatedSettings);
    return updatedSettings;
  }

  @Put('/settings/favKey')
  async setFavKey(@Req() req, @Body() request: UpdateFavoriteSongKeyRequest): Promise<UserSettings> {
    const error = validateObject(request, updateFavoriteSongKeyRequestAssertion);
    if (error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    const user: User = BackendAuthService.getUserOrFail(req);
    console.log('UserController.setFavKey', user.email, request);
    const settings = await this.getUserSettings(user);
    const updatedSettings = { ...settings, favKey: request.key };
    await this.userDbi.updateSettings(user.id, updatedSettings);
    return updatedSettings;
  }

  private async getUserSettings(user: User): Promise<UserSettings> {
    const settings = await this.userDbi.getSettings(user.id);
    if (settings === undefined) {
      throw new HttpException(`Settings not found! User: ${user.email}, id: ${user.id}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const defaultSettings = newDefaultUserSettings();
    return settings == null ? defaultSettings : { ...defaultSettings, ...settings };
  }
}
