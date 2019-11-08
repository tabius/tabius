import {ChangeDetectionStrategy, Component, EventEmitter, Output} from '@angular/core';
import {getTranslitLowerCase} from '@common/util/seo-translit';

@Component({
  selector: 'gt-artist-editor',
  templateUrl: './artist-editor.component.html',
  styleUrls: ['./artist-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtistEditorComponent {

  /** Emitted when panel wants to be closed. */
  @Output() closeRequest = new EventEmitter();

  name = '';

  mount = '';

  create() {
    alert('Create!');
  }

  close() {
    this.closeRequest.emit();
  }

  onNameChanged() {
    this.mount = getTranslitLowerCase(this.name);
  }
}
