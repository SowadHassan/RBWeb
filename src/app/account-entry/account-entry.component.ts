import { Component, OnInit } from '@angular/core';
import { SqlService } from '../service/sql/sql.service';
import { CookieService } from 'ngx-cookie-service';
import { resetFakeAsyncZone } from '@angular/core/testing';
import { MessageService } from 'primeng/components/common/messageservice';
import { Router } from '@angular/router';

@Component({
  selector: 'app-account-entry',
  templateUrl: './account-entry.component.html',
  styleUrls: ['./account-entry.component.css']
})
export class AccountEntryComponent implements OnInit {

  billNo: any;
  clientDetails;
  oderList: { [k: string]: any } = {};
  checkAuto: any;
  systemLoad = false;

  // Billing System
  amount: any;
  advance: any;
  due: any;
  balance: any;
  prevPay = false;
  isStored = false;

  // type Price
  pvc = 15;
  pana = 15;

  constructor(
    private sql: SqlService,
    private cookie: CookieService,
    private message: MessageService,
    private router: Router
  ) { }

  ngOnInit() {
    this.billNo = this.cookie.get('billno');
    this.get_bill_info();
    this.get_client_info();
  }

  get_client_info() {
    const Temp_store = { 'billNo': this.billNo };
    this.sql.postRequest('accountEntry/getClientDetails.php', Temp_store).subscribe(
      response => {

        this.clientDetails = response.json()[0];
        // console.log(this.clientDetails);
        this.systemLoad = true;
      },
      err => {
        console.log(err);
      });
  }

  get_bill_info() {
    const Temp_store = { 'billNo': this.billNo };
    this.sql.postRequest('accountEntry/getAccountDetails.php', Temp_store).subscribe(
      response => {
        this.oderList = response.json();
        console.table(this.oderList);
        const temp = response.json()[0].advance;
        if (temp > 0) {
          this.prevPay = true;
        } else {
          this.calculate_total();
        }
      },
      err => {
        console.log(err);
      }
    );
  }

  // // check and set value of pvc and pana
  // Old code
  // calculate(val, type) {

  //   if (type === 'PVC') {
  //     this.pvc = val;
  //     console.log(this.pvc);
  //   }
  //   if (type === 'Pana') {
  //     this.pana = val;
  //     console.log(this.pana);
  //   }
  //   this.calculate_total();

  // }

  setPrice(i, val, index) {
    this.oderList[i].PricePerSft = val;
    this.calculate_total();
    this.updateSftPriceValue(val, Number(index));
    console.table(this.oderList);
  }

  // calculate total amount
  calculate_total() {
    let cal = 0;
    const ob: { [k: string]: any } = this.oderList;
    for (let i = 0; i < this.oderList.length; i++) {
      cal = ob[i].sft * ob[i].quantity * ob[i].PricePerSft + cal;
      // console.log(cal);
    }
    this.amount = cal;
    // console.log(cal);
  }

  // calculate advace
  advance_cal(val) {
    if (this.amount < val) {
      this.advance = 'Invalid Amount';
      this.due = 'Invalid Amount';
    } else {
      this.due = this.amount - val;
    }
  }

  make_data_store() {
    for (let i = 0; i < this.oderList.length; i++) {
      const ob: { [k: string]: any } = this.oderList;
      if (ob[i].PrintType === 'PVC') {
        const temp = this.make_ammount(this.pvc, ob[i].id);
        this.store_to_db(temp);
      }
      if (ob[i].PrintType === 'Pana') {
        const temp = this.make_ammount(this.pana, ob[i].id);
        this.store_to_db(temp);
      }
      console.log(i);
    }
  }

  make_ammount(type, AIid) {
    const temp = {
      'billNo': this.billNo,
      'AIid': AIid,
      'pricePerSft': type,
      'amount': this.amount,
      'advance': this.advance,
      'due': this.due
    };
    return temp;
  }

  store_to_db(val) {
    console.log(val);
    // store the db procedure
    this.sql.postRequest('accountEntry/storeUpdateAccount.php', val).subscribe(
      response => {
        console.log(response);
        if (response.json()[0].status === 'Done') {
          // add here is ok Button
          this.message.add({ severity: 'success', summary: 'Success', detail: 'Account Entry Success' });
          this.isStored = true;
        } else {
          this.message.add({ severity: 'error', summary: 'Error Message', detail: 'Failed to Store' });
        }

      },
      err => {
        console.log(err);
      });
  }

  updateSftPriceValue(price, index) {
    // tslint:disable-next-line:max-line-length
    const sql = { 'sql': 'UPDATE account SET account.PricePerSft ="' + price + '" WHERE account.BillNo = "' + this.billNo + '" and account.AIid = "' + index + '"' };
    this.sql.postRequest('anySql/anySql.php', sql).subscribe(
      response => {
        console.log(response.json());
        if (response.json()[0].status === 'Done') {
          this.message.add({ severity: 'info', summary: 'Info', detail: 'Price Updated' });
        }
      },
      err => {
        console.log(err);
        this.message.add({ severity: 'error', summary: 'Problem Found', detail: err });
      });
  }

  print() {
    this.cookie.set('billno', this.billNo);
    this.router.navigate(['/print']);
  }
}
