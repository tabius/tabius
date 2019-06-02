import {ChangeDetectionStrategy, Component} from '@angular/core';

@Component({
  selector: 'gt-news-page-component',
  templateUrl: './news-page.component.html',
  styleUrls: ['./news-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewsPageComponent {

}
