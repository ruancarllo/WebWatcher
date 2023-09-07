import fs from 'node:fs'
import path from 'node:path';
import {spawn} from 'node:child_process';

import chokidar from 'npm:chokidar';

class WebWatcher {
  private static readonly scriptDirectory = new URL('.', import.meta.url).pathname;
  
  private readonly chromeExecutablePath: string | undefined;
  private readonly chromeDataDirectory: string;
  private readonly isChromeInstalled: boolean;

  constructor() {
    switch (Deno.build.os) {
      case 'windows':
        this.chromeExecutablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        break;
      case 'darwin':
        this.chromeExecutablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        break;
      case 'linux':
        this.chromeExecutablePath = '/usr/bin/google-chrome';
        break;
      default:
        this.chromeExecutablePath = undefined;
    }

    this.chromeDataDirectory = path.join(WebWatcher.scriptDirectory, '.chrome');
    this.isChromeInstalled = this.chromeExecutablePath !== undefined && fs.existsSync(this.chromeExecutablePath);
  }

  public start(): void {
    if (this.isChromeInstalled) {
      this.runChrome();
      this.watchChrome();
    }
    
    else {
      console.error('Chrome is not installed in your computer!');
    }
  }

  private runChrome(): void {
    spawn(this.chromeExecutablePath as string, [
      '--new-window',
      `--user-data-dir=${this.chromeDataDirectory}`
    ]);
  }

  private watchChrome(): void {
    const watcher = chokidar.watch(this.chromeDataDirectory, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: true
    });

    WebWatcher.watchEvents.forEach((event) => {
      const eventAlignedOutput = event.toUpperCase() + " ".repeat(WebWatcher.biggestWatchEventLength - event.length)
      watcher.on(event, (path) => this.logWatcherEvent(eventAlignedOutput, path));
    });
  }

  private logWatcherEvent(eventAlignedOutput: string, path: string): void {
    const operationTimestamp = new Date().toLocaleTimeString();
    const pathSizeInMB = fs.existsSync(path) ? `(${(fs.statSync(path).size / (1024*1024)).toFixed(2)} mb)` : '';

    console.log(
      WebWatcher.colorizeString('cyan', operationTimestamp),
      WebWatcher.colorizeString('opposite', '->'),
      WebWatcher.colorizeString('red', eventAlignedOutput),
      WebWatcher.colorizeString('opposite', path),
      WebWatcher.colorizeString('green', pathSizeInMB)
    )
  }

  private static colorizeString(color: 'cyan' | 'green' | 'red' | 'opposite', output: string): string {
    let colorizedOutput = output;

    if (color === 'cyan') colorizedOutput = `\x1b[36m${output}\x1b[0m`;
    if (color === 'green') colorizedOutput = `\x1b[32m${output}\x1b[0m`;
    if (color === 'red') colorizedOutput = `\x1b[31m${output}\x1b[0m`;

    return colorizedOutput;
  }

  private static watchEvents = ['add', 'change', 'unlink', 'addDir', 'unlinkDir'];
  private static biggestWatchEventLength = this.watchEvents.sort((a, b) => a.length - b.length).reverse()[0].length;
}

function main(): void {
  const webwatcher = new WebWatcher();
  webwatcher.start();
}

main()