import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { route } from '@/server/http/route';

export const GET = route(async () => {
  const file = fs.readFileSync(path.join(process.cwd(), 'docs', 'openapi.yaml'), 'utf8');
  return NextResponse.json(YAML.parse(file));
});
