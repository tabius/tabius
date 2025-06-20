import { Injectable, OnModuleInit } from '@nestjs/common';
import TelegramBot, { CallbackQuery, InlineKeyboardButton, Message } from 'node-telegram-bot-api';
import { SERVER_CONFIG } from '@backend/backend-config';
import { assertTruthy } from 'assertic';
import { FullTextSearchDbi } from '@backend/db/full-text-search-dbi.service';
import { SongDbi } from '@backend/db/song-dbi.service';
import { FullTextSongSearchResult } from '@common/api-model';
import { escapeHtml } from '@common/util/misc-utils';
import { CollectionDbi } from '@backend/db/collection-dbi.service';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly lp = 'TelegramService:';
  private bot!: TelegramBot;
  private readonly maxSearchResults = 10;

  constructor(
    private readonly songDbi: SongDbi,
    private readonly collectionDbi: CollectionDbi,
    private readonly fullTextSearchDbi: FullTextSearchDbi,
  ) {}

  onModuleInit() {
    assertTruthy(SERVER_CONFIG.telegramBotToken, 'telegramBotToken is not provided');
    this.bot = new TelegramBot(SERVER_CONFIG.telegramBotToken, { polling: true });
    this.registerHandlers();
    console.log('Telegram bot started polling');
  }

  private registerHandlers(): void {
    // All incoming text messages.
    this.bot.on('message', this.handleIncoming.bind(this));

    // Menu clicks.
    this.bot.on('callback_query', this.handleCallbackQuery.bind(this));
  }

  private async handleIncoming(msg: Message): Promise<Message | undefined> {
    console.log(`${this.lp} Got incoming message`, msg);
    const chatId = msg.chat.id;
    const text = msg.text?.trim();
    if (!text) {
      return undefined;
    }
    if (text === '/start') {
      return this.sendStart(chatId);
    }
    if (text === '/help' || /help/i.test(text)) {
      return this.sendHelp(chatId);
    }

    const songs = await this.searchSongs(text);
    if (songs.length === 0) {
      return this.sendMessage(chatId, 'Ничего не найдено по вашему запросу.');
    }
    const inlineKeyboard: Array<Array<InlineKeyboardButton>> = songs.slice(0, this.maxSearchResults).map(song => [
      {
        text: `${song.collectionName}: ${song.songTitle}`,
        callback_data: `song_${song.songId}`,
      },
    ]);
    const message =
      songs.length > this.maxSearchResults
        ? `Показаны первые ${this.maxSearchResults} результатов. Выберете песню или сделайте более точный запрос:`
        : 'Выберете песню:';
    await this.bot.sendMessage(chatId, message, { reply_markup: { inline_keyboard: inlineKeyboard } });
  }

  private async handleCallbackQuery(query: CallbackQuery): Promise<void> {
    console.log(this.lp + ' handleCallbackQuery', query);
    const { data, message } = query;
    if (!data || !message) {
      return;
    }
    const chatId = message.chat.id;

    // Check if song element is clicked.
    if (data.startsWith('song_')) {
      const songId = data.split('_')[1];
      const song = await this.getSongById(Number(songId));
      let response: string;
      if (song) {
        response = `<b>${escapeHtml(`${song.collection}: ${song.title}`)}</b><pre>${escapeHtml(song.text)}</pre>`;
      } else {
        response = 'Песня не найдена';
      }
      await this.bot.sendMessage(chatId, response, { parse_mode: 'HTML' });
    }

    // Confirm that query is processed.
    await this.bot.answerCallbackQuery(query.id);
  }

  private async searchSongs(text: string): Promise<Array<FullTextSongSearchResult>> {
    console.log(`${this.lp} searchSongs`, text);
    const results = await this.fullTextSearchDbi.searchForSongsByText(text, this.maxSearchResults + 5, this.maxSearchResults + 5);
    const uniqueById = (arr: Array<FullTextSongSearchResult>): Array<FullTextSongSearchResult> =>
      arr.filter((item, idx, self) => idx === self.findIndex(other => other.songId === item.songId));
    return uniqueById(results);
  }

  private async getSongById(songId: number): Promise<TelegramSong | undefined> {
    const song = await this.songDbi.getSong(songId);
    if (!song) {
      return undefined;
    }
    const songDetails = (await this.songDbi.getSongsDetails([songId]))[0];
    if (!songDetails) {
      return undefined;
    }
    const collection = await this.collectionDbi.getCollectionById(song.collectionId);
    return { collection: collection?.name || '?', title: song.title, text: songDetails.content };
  }

  async sendStart(chatId: number): Promise<Message> {
    return this.bot.sendMessage(chatId, `Привет! Я — бот сайта Tabius.Ru. Напишите часть текста песни и я покажу ее аккорды.`);
  }

  async sendHelp(chatId: number): Promise<Message> {
    return this.bot.sendMessage(chatId, `Просто введите часть названия песни, я найду подходящие варианты и покажу их.`, {
      parse_mode: 'Markdown',
    });
  }

  async sendMessage(chatId: number, text: string): Promise<Message> {
    return this.bot.sendMessage(chatId, text);
  }
}

interface TelegramSong {
  collection: string;
  title: string;
  text: string;
}
