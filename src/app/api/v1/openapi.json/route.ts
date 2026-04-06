import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

export async function GET() {
  try {
    const yamlPath = path.join(process.cwd(), 'docs', 'openapi.yaml');
    const file = fs.readFileSync(yamlPath, 'utf8');
    const json = YAML.parse(file);
    return NextResponse.json(json);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to load OpenAPI specification', details: err.message }, { status: 500 });
  }
}

