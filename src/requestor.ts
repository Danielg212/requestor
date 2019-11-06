import axios from 'axios'

//Globals
module Global {

    export class Error {
        public static readonly EXPIRED_TOKEN: number = 401
        public static readonly MAINTENANCE: number = 503
    }

    export class Msg {
        public static readonly MISSING_BODY: string = 'missing body'
    }

    export class RefreshToken {
        public static readonly REFRESH_TOKEN_API_URL: string = '/auth/refreshToken'
        public static readonly REFRESH_TOKEN_REQUEST_NAME: string = 'refreshToken'
        public static readonly TOKEN_HEADER_KEY: string = 'Authorization'
    }
}

//Interfaces
export interface OnRequestorCallback {

    onProgress(requestName?: string): void

    onSuccess<T>(data?: T, requestName?: string, message?: string): void

    onSuccess<T>(data?: T[], requestName?: string, message?: string): void

    onError(messages: string[], code: number, requestName?: string): void

    onProgressFinished(success: boolean): void

    onSetAccessToken?(token: string): void

    onSetRefreshToken?(token: string): void

    onGetRefreshToken?(): string
}

export interface OnRequestorCommit {

    setQueryString(qs: QueryString): any

    setRoutingRule(rr: RoutingRule): any

    getHeader(): Header

    setHeader(header: Header): any

    commit<T>(baseUrl: string, apiUrl: string, callback: OnRequestorCallback, requestName?: string): void
}

export interface BodyRequestor<T> {
    setBody(body: T): any
}

//Parameters
export class QueryString {

    private qsMap: Map<string, string> = new Map<string, string>()

    append(key: string, value: string): QueryString {
        this.qsMap.set(key, value)
        return this
    }

    toString(): string {
        let res = '?'
        this.qsMap.forEach((value: string, key: string) => {
            res += key + '=' + value + '&'
        })
        return res.slice(0, -1)    }
}

export class RoutingRule {

    private rrArr: Array<string> = []

    append(param: string): RoutingRule {
        this.rrArr.push(param)
        return this
    }

    toString(): string {
        let res = ''
        this.rrArr.forEach(param => {
            res += param + '/'
        })
        return res.slice(0, -1)
    }
}

export class Header {

    private headerMap: Map<string, string> = new Map<string, string>()

    public append(key: string, value: string): Header {
        this.headerMap.set(key, value)
        return this
    }

    public getHeader(): any {
        let headerObj = {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
        this.headerMap.forEach((value: string, key: string) => {
            headerObj[key] = value
        })
        return headerObj
    }

    public getHeaderValue(key: string): string {
        return this.headerMap.get(key)
    }
}

//Rest api
export class HttpGet implements OnRequestorCommit {

    private queryString: QueryString = null
    private routingRule: RoutingRule = null
    private header: Header = null

    getHeader(): Header {
        return this.header
    }

    setHeader(header: Header): HttpGet {
        this.header = header
        return this
    }

    setQueryString(qs: QueryString): HttpGet {
        this.queryString = qs
        return this
    }

    setRoutingRule(rr: RoutingRule): HttpGet {
        this.routingRule = rr
        return this
    }

    commit<T>(baseUrl: string, apiUrl: string, callback: OnRequestorCallback, requestName?: string) {
        try {
            callback.onProgress(requestName)

            let url: string = baseUrl + apiUrl
            url = this.queryString != null ? url + this.queryString.toString()
                : this.routingRule != null ? url + this.routingRule.toString()
                    : url

            if (this.header == null) {
                this.header = new Header()
            }

            axios.get(url, {
                headers: this.header.getHeader()
            })
                .then((response: any) => {
                    let data = response.data
                    let success = data.success
                    if (success) {
                        callback.onProgressFinished(true)
                        let message: string = (data.messages && data.messages.length > 0) ? data.messages[0] : 'success'
                        data ? callback.onSuccess(data.body || data.bodyList, requestName, message)
                            : callback.onSuccess(data, requestName, 'success')
                    } else {
                        callback.onProgressFinished(false)
                        callback.onError(data.messages, data.errorCode, requestName)
                    }
                })
                .catch((error: any) => {

                    if (!error.request) {
                        callback.onProgressFinished(false)
                        console.error("Error in callback for '" + requestName + "': " + error)
                        return
                    }

                    let messages: string[] = error.response ? error.response.data.messages : new Array<string>(error.toString());
                    let code: number = error.response
                        ? (error.response.data ? error.response.data.errorCode : error.response.status)
                        : Global.Error.MAINTENANCE

                    if (code === Global.Error.EXPIRED_TOKEN) {
                        let refreshTokenCallback: RefreshTokenRequestorCallback = new RefreshTokenRequestorCallback(callback, this, baseUrl, apiUrl, requestName)
                        new HttpPost()
                            .setHeader(new Header().append(Global.RefreshToken.TOKEN_HEADER_KEY, this.header.getHeaderValue(Global.RefreshToken.TOKEN_HEADER_KEY)))
                            .setBody({refreshToken: callback.onGetRefreshToken()})
                            .commit(baseUrl, Global.RefreshToken.REFRESH_TOKEN_API_URL, refreshTokenCallback, Global.RefreshToken.REFRESH_TOKEN_REQUEST_NAME)
                    } else {
                        callback.onProgressFinished(false)
                        callback.onError(messages, code, requestName)
                    }
                })
        } catch (ex) {
            callback.onProgressFinished(false)
            console.error("Error in '" + requestName + "': " + ex)
        }
    }
}

export class HttpPost<T> implements BodyRequestor<T>, OnRequestorCommit {

    private queryString: QueryString = null
    private routingRule: RoutingRule = null
    private body: T = null
    private formData: FormData | null = null
    private header: Header = null

    getHeader(): Header {
        return this.header
    }

    setHeader(header: Header): HttpPost<T> {
        this.header = header
        return this
    }

    setQueryString(qs: QueryString): HttpPost<T> {
        this.queryString = qs
        return this
    }

    setRoutingRule(rr: RoutingRule): HttpPost<T> {
        this.routingRule = rr
        return this
    }

    setBody(body: T): HttpPost<T> {
        this.body = body
        return this
    }

    setFormData(formData: FormData): HttpPost<T> {
        this.formData = formData
        this.header.append('Content-Type', 'multipart/form-data')
        return this
    }

    commit<T>(baseUrl: string, apiUrl: string, callback: OnRequestorCallback, requestName?: string) {
        try {
            callback.onProgress(requestName)

            if (this.body == null) {
                throw new Error(Global.Msg.MISSING_BODY)
            }

            let url: string = baseUrl + apiUrl
            url = this.queryString != null ? url + this.queryString.toString()
                : this.routingRule != null ? url + this.routingRule.toString()
                    : url

            if (this.header == null) {
                this.header = new Header()
            }

            axios.post(url, this.formData || this.body, {
                headers: this.header.getHeader()
            })
                .then((response: any) => {
                    let data = response.data
                    let success = data.success
                    if (success) {
                        callback.onProgressFinished(true)
                        let message: string = (data.messages && data.messages.length > 0) ? data.messages[0] : 'success'
                        data ? callback.onSuccess(data.body || data.bodyList, requestName, message)
                            : callback.onSuccess(data, requestName, 'success')
                    } else {
                        callback.onProgressFinished(false)
                        callback.onError(data.messages || data.bodyList, data.errorCode, requestName)
                    }
                })
                .catch((error: any) => {

                    if (!error.request) {
                        callback.onProgressFinished(false)
                        console.error("Error in callback for '" + requestName + "': " + error)
                        return
                    }

                    let messages: string[] = error.response ? error.response.data.messages : new Array<string>(error.toString())
                    let code: number = error.response
                        ? (error.response.data ? error.response.data.errorCode : error.response.status)
                        : Global.Error.MAINTENANCE

                    if (code === Global.Error.EXPIRED_TOKEN) {
                        let refreshTokenCallback: RefreshTokenRequestorCallback = new RefreshTokenRequestorCallback(callback, this, baseUrl, apiUrl, requestName)
                        new HttpPost()
                            .setHeader(new Header().append(Global.RefreshToken.TOKEN_HEADER_KEY, this.header.getHeaderValue(Global.RefreshToken.TOKEN_HEADER_KEY)))
                            .setBody({refreshToken: callback.onGetRefreshToken()})
                            .commit(baseUrl, Global.RefreshToken.REFRESH_TOKEN_API_URL, refreshTokenCallback, Global.RefreshToken.REFRESH_TOKEN_REQUEST_NAME)
                    } else {
                        callback.onProgressFinished(false)
                        callback.onError(messages, code, requestName)
                    }
                })
        } catch (ex) {
            callback.onProgressFinished(false)
            console.error("Error in '" + requestName + "': " + ex)
        }
    }
}

export class HttpPut<T> implements BodyRequestor<T>, OnRequestorCommit {

    private queryString: QueryString = null
    private routingRule: RoutingRule = null
    private body: T = null
    private header: Header = null

    getHeader(): Header {
        return this.header
    }

    setHeader(header: Header): HttpPut<T> {
        this.header = header
        return this
    }

    setQueryString(qs: QueryString): HttpPut<T> {
        this.queryString = qs
        return this
    }

    setRoutingRule(rr: RoutingRule): HttpPut<T> {
        this.routingRule = rr
        return this
    }

    setBody(body: T): HttpPut<T> {
        this.body = body
        return this
    }

    commit<T>(baseUrl: string, apiUrl: string, callback: OnRequestorCallback, requestName?: string) {
        try {
            callback.onProgress(requestName)

            if (this.body == null) {
                throw new Error(Global.Msg.MISSING_BODY)
            }

            let url: string = baseUrl + apiUrl
            url = this.queryString != null ? url + this.queryString.toString()
                : this.routingRule != null ? url + this.routingRule.toString()
                    : url

            if (this.header == null) {
                this.header = new Header()
            }

            axios.put(url, this.body, {
                headers: this.header.getHeader()
            })
                .then((response: any) => {
                    let data = response.data
                    let success = data.success
                    if (success) {
                        callback.onProgressFinished(true)
                        let message: string = (data.messages && data.messages.length > 0) ? data.messages[0] : 'success'
                        data ? callback.onSuccess(data.body || data.bodyList, requestName, message)
                            : callback.onSuccess(data, requestName, 'success')
                    } else {
                        callback.onProgressFinished(false)
                        callback.onError(data.messages, data.errorCode, requestName)
                    }
                })
                .catch((error: any) => {

                    if (!error.request) {
                        callback.onProgressFinished(false)
                        console.error("Error in callback for '" + requestName + "': " + error)
                        return
                    }

                    let messages: string[] = error.response ? error.response.data.messages : new Array<string>(error.toString())
                    let code: number = error.response
                        ? (error.response.data ? error.response.data.errorCode : error.response.status)
                        : Global.Error.MAINTENANCE

                    if (code === Global.Error.EXPIRED_TOKEN) {
                        let refreshTokenCallback: RefreshTokenRequestorCallback = new RefreshTokenRequestorCallback(callback, this, baseUrl, apiUrl, requestName)
                        new HttpPost()
                            .setHeader(new Header().append(Global.RefreshToken.TOKEN_HEADER_KEY, this.header.getHeaderValue(Global.RefreshToken.TOKEN_HEADER_KEY)))
                            .setBody({refreshToken: callback.onGetRefreshToken()})
                            .commit(baseUrl, Global.RefreshToken.REFRESH_TOKEN_API_URL, refreshTokenCallback, Global.RefreshToken.REFRESH_TOKEN_REQUEST_NAME)
                    } else {
                        callback.onProgressFinished(false)
                        callback.onError(messages, code, requestName)
                    }
                })
        } catch (ex) {
            callback.onProgressFinished(false)
            console.error("Error in '" + requestName + "': " + ex)
        }
    }
}

export class RefreshTokenRequestorCallback implements OnRequestorCallback {

    private requestorCallback: OnRequestorCallback
    private requestorCommit: OnRequestorCommit
    private baseUrl: string
    private apiUrl: string
    private requestName: string

    constructor(requestorCallback: OnRequestorCallback, requestorCommit: OnRequestorCommit, baseUrl: string, apiUrl: string, requestName: string) {
        this.requestorCallback = requestorCallback
        this.requestorCommit = requestorCommit
        this.baseUrl = baseUrl
        this.apiUrl = apiUrl
        this.requestName = requestName
    }

    onError(messages: string[], code: number, requestName?: string): void {
        this.requestorCallback.onError(messages, code, this.requestName)
    }

    onSuccess<T>(data?: any, requestName?: string, message?: string): void {
        this.requestorCallback.onSetAccessToken(data.accessToken)
        this.requestorCallback.onSetRefreshToken(data.refreshToken)

        let header: Header = this.requestorCommit.getHeader()
        header.append('Authorization', 'Bearer ' + data.accessToken)
        this.requestorCommit.setHeader(header)

        this.requestorCommit.commit(this.baseUrl, this.apiUrl, this.requestorCallback, this.requestName)
    }

    onProgress(requestName?: string): void {
    }

    onProgressFinished(success: boolean): void {
    }
}