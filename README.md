
> Http Generic Type Callback

## Installation

```sh
$ npm install --save requestor-api   
```

## Usage

Implement OnRequestorCallback
```javascript
   export default class ButtonComponent extends Vue implements  OnRequestorCallback{...}
```

Will implements 3 methods
```javascript
    
    onProgress(requstName?: string): void {
        // progress, by default requestName is empty
    }

    onSuccess<T>(data?: T, requstName?: string, message?: string): void;
    onSuccess<T>(data?: T[], requstName?: string, message?: string): void;
    
    onSuccess(data?: any, requstName?: any, message?: any) {
        // success return object or array
    }
    
    onError(message: string, code: number, requstName?: string): void {
        // error with message and code
    }
```
## Headers
```javascript
    
    let header: Header = new Header()
    
    header.append("Authorization","Bearer xxx.xxx")
          .append("UserToken","some-token-for-user")
          ....
          .append("More","headers-parameters");
```
## Url Parameters

 Query String (over url)

```javascript
    let qs = new QueryString()
               .append("token", "xxx.xxx.xxx")
               .append("type", "jwt")

```
> will generate url like -> www.some-url.com/?token=xxx.xxx.xxx&type=jwt

 Routing Rule (over url)

```javascript
 let rr = new RoutingRule()
             .append("user")
             .append("xxx.xxx.xxx")
```
> will generate url like -> www.some-url.com/user/xxx.xxx.xxx

## Requests

> Http Get, Post, Put, Delete

Get

```javascript
// Without url parameters & no request name
    new HttpGet().commit(url,this)


//  with Header and Query String
    new HttpGet().setHeader(header)
                 .setQueryString(qs)
                 .commit(url, this)

// With Routing Parameters & Header
    new HttpGet().setHeader(header)
                 .setRoutingRule(rr)
                 .commit(url,this)  

```
Post

```javascript

//Example for POCO class
    class User{
        userId:number;
        name:string;
        email:string;
    }

    let user = new User();
        user.userId = 1;
        user.name = "jhon doe";
        user.email = "some@email.com";

    new HttpPost().setHeader(header)
                .setBody(user)
                .commit<User>(url,this);

    // With Url Parameters
    new HttpPost().setHeader(header)
                .setQueryString(qs)
                .setBody(user)
                .commit<User>(url,this);

    // Or
    new HttpPost().setHeader(header)
                .setRoutingRule(rr)
                .setBody(user)
                .commit<User>(url,this);

```
## Button Login Example based on requestor with Http Post Request

```javascript
import Vue from 'vue';
import Component from 'vue-class-component';
import { OnRequestorCallback, HttpGet, Header, HttpPost, RoutingRule, QueryString } from 'requestor';


//Create Your POCO class
export class User {
  managingCompanyId: number;
  idNumber: string;
  password: string;
}


@Component({})
export default class LoginButton extends Vue implements OnRequestorCallback {

  private header: Header = new Header();

  constructor() {
    super();
    this.header.append("Authorization", "some-auth");
  }

  //Login event
  onLogin() {

    // Create routeing params
    let rr: RoutingRule = new RoutingRule()
      .append("user")

    // Create your new User
    let user: User = new User();
    user.managingCompanyId = 1;
    user.idNumber = "123";
    user.password = "22445445";

    //Call to http Post request
    new HttpPost()
      .setHeader(this.header)
      .setRoutingRule(rr)
      .setBody(user)
      .commit(url, this, this.LOGIN)


  }

  onProgress(requstName?: string | undefined): void {

  }

  onSuccess<User>(data?: User | undefined, requstName?: string | undefined, message?: string | undefined): void;
  onSuccess<User>(data?: User[] | undefined, requstName?: string | undefined, message?: string | undefined): void;
  onSuccess(data?: any, requstName?: any, message?: any) {

    /*
      Return Serilized User Object
    */

  }

  onError(message: string, code: number, requstName?: string | undefined): void {
    /*
      Return error with status code and mesage 
    */
  }
}

```
 Delete
// Todo
## License
MIT

 [daniel gi]("")
