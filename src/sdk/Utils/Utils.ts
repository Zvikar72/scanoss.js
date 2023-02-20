import path from 'path';
import fs from 'fs';
import getUri from 'get-uri';
import pac, { FindProxyForURL } from 'pac-resolver';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';
import * as Http from 'http';
import * as Https from 'https';

export class Utils {
  private static PackageJSONPath: string = path.join(__dirname,"../../../../package.json");
  private static PackageJSON: any;
  private static PAC_FindProxyForURL: FindProxyForURL;



  public static getPackageVersion(): string {
    if (!this.PackageJSON) this.PackageJSON = JSON.parse(fs.readFileSync(this.PackageJSONPath, 'utf-8'));
    return this.PackageJSON.version
  }


  public static async PACProxyResolver(pacURI: string, URL: string) {
    const resolverStream = await getUri(pacURI);

    const chunks = []
    for await (let chunk of resolverStream) chunks.push(chunk)
    const resolver = Buffer.concat(chunks);

    this.PAC_FindProxyForURL = pac(resolver);
    return this.PAC_FindProxyForURL(URL)
  }

  public static async testConnection(hostname:string, agent?: Http.Agent | Https.Agent): Promise<boolean> {
    let host = new URL(hostname).origin;
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      const response = await fetch(host, {
        ...(agent && {agent}),
        // @ts-ignore
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(response.status.toString());
      return true;
    } catch (e) {
      return false;
    }
  }

  public static async testProxyConnection(hostname:string, proxy: string ): Promise<boolean> {
    let proxyAgent: HttpsProxyAgent | HttpProxyAgent;
    if (/HTTPS/i.test(hostname)) proxyAgent = new HttpsProxyAgent(proxy);
    else if (/HTTP/i.test(hostname)) proxyAgent = new HttpProxyAgent(proxy);
    if (!proxyAgent) return false;
    return await this.testConnection(hostname, proxyAgent);
  }

}