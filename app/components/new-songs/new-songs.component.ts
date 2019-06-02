import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'gt-new-songs',
  templateUrl: './new-songs.component.html',
  styleUrls: ['./new-songs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewSongsComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
