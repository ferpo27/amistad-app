import { spawn, ExecException } from 'child_process';

export function compileTS(): Promise<void> {
  return new Promise((resolve, reject) => {
    const tsc = spawn('tsc', ['--noEmit', '--project', 'tsconfig.json']);

    tsc.stdout.on('data', (data: Buffer) => {
      console.log(data.toString());
    });

    tsc.stderr.on('data', (data: Buffer) => {
      console.error(data.toString());
    });

    tsc.on('error', (err: ExecException) => {
      reject(err);
    });

    tsc.on('close', (code: number) => {
      if (code === 0) {
        console.log(`TSC cerrado con código ${code}`);
        resolve();
      } else {
        const error = new Error(`TSC exited with code ${code}`);
        reject(error);
      }
    });
  });
}