import {Body, Controller, Delete, Get, Logger, Param, Post, Put, Session, UseGuards} from '@nestjs/common';
import {PlaylistDbi} from '@server/db/playlist-dbi.service';
import {ServerAuthGuard} from '@server/util/server-auth.guard';
import {Playlist, User} from '@common/user-model';
import {conformsTo, validate} from 'typed-validation';
import {CreatePlaylistRequestValidator, PlaylistValidator} from '@server/util/validators';
import {CreatePlaylistRequest, CreatePlaylistResponse, DeletePlaylistResponse, UpdatePlaylistResponse} from '@common/ajax-model';

@Controller('/api/playlist')
export class PlaylistController {
  private readonly logger = new Logger(PlaylistController.name);

  constructor(private playlistDbi: PlaylistDbi) {
  }

  /** Returns all current user's playlists.*/
  @UseGuards(ServerAuthGuard)
  @Get('/by-current-user')
  async getByCurrentUser(@Session() session): Promise<Playlist[]> {
    const user: User = ServerAuthGuard.getUserOrFail(session);
    this.logger.log(`by-current-user, user: ${user.email}`);
    return this.playlistDbi.getPlaylists(user.id);
  }

  /** Creates new empty playlist and returns list of all user playlists. */
  @UseGuards(ServerAuthGuard)
  @Post('/create')
  async create(@Session() session, @Body() createPlaylistRequest: CreatePlaylistRequest): Promise<CreatePlaylistResponse> {
    const vr = validate(createPlaylistRequest, conformsTo(CreatePlaylistRequestValidator));
    if (!vr.success) {
      throw Error(vr.toString());
    }
    const user: User = ServerAuthGuard.getUserOrFail(session);
    this.logger.log(`create: ${createPlaylistRequest.name}, user: ${user.email}`);
    await this.playlistDbi.create(user.id, createPlaylistRequest);
    return this.playlistDbi.getPlaylists(user.id);
  }

  /** Updates user playlist and returns list of all user playlists. */
  @Put('/update')
  @UseGuards(ServerAuthGuard)
  async update(@Session() session, @Body() playlist: Playlist): Promise<UpdatePlaylistResponse> {
    const vr = validate(playlist, conformsTo(PlaylistValidator));
    if (!vr.success) {
      throw Error(vr.toString());
    }
    const user: User = ServerAuthGuard.getUserOrFail(session);
    this.logger.log(`update: ${playlist.name}, user: ${user.email}`);
    await this.playlistDbi.update(user.id, playlist);
    return this.playlistDbi.getPlaylists(user.id);
  }

  /** Removes user playlist and returns list of all user playlists. */
  @Delete('/delete/:id')
  @UseGuards(ServerAuthGuard)
  async delete(@Session() session, @Param('id') playlistId: string): Promise<DeletePlaylistResponse> {
    const user: User = ServerAuthGuard.getUserOrFail(session);
    this.logger.log(`delete: ${playlistId}, user: ${user.email}`);
    const vr = validate(playlistId, conformsTo(PlaylistValidator.id));
    if (!vr.success) {
      throw Error(vr.toString());
    }
    await this.playlistDbi.delete(user.id, playlistId);
    return this.playlistDbi.getPlaylists(user.id);
  }

  @Get('/by-id/:id')
  byId(@Session() session, @Param('id') playlistId: string): Promise<Playlist|undefined> {
    this.logger.log('by-id');
    const user = ServerAuthGuard.getUserOrUndefined(session);
    const vr = validate(playlistId, conformsTo(PlaylistValidator.id));
    if (!vr.success) {
      throw Error(vr.toString());
    }
    return this.playlistDbi.getPlaylistById(playlistId, user ? user.id : undefined);
  }

}
