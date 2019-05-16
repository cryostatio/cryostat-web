import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-client-connect',
  templateUrl: './client-connect.component.html'
})
export class ClientConnectComponent implements OnInit {
  @Output() clientSelected = new EventEmitter<string>();
  @Input() connected = false;
  clientUrl = '';

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.http.get('/clienturl')
      .subscribe(
        (url: any) => {
          this.clientSelected.emit(url.clientUrl);
        },
        (err: any) => {
          console.log(err);
        }
      );
  }

  fire(): void {
    this.clientSelected.emit(this.clientUrl);
    this.clientUrl = '';
  }
}
