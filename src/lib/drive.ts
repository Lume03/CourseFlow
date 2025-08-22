'use client';

import type { AppData } from './types';
import { initialCourses, initialGroups, initialTasks } from './data';

const FILE_NAME = 'courseflow-data.json';
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3';

async function findFile(accessToken: string): Promise<string | null> {
  const res = await fetch(`${DRIVE_API_URL}/files?q=name='${FILE_NAME}' and 'appDataFolder' in parents&spaces=appDataFolder&fields=files(id)`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to search for file in Google Drive');
  }

  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

export async function findOrCreateDataFile(accessToken: string): Promise<string> {
  let fileId = await findFile(accessToken);

  if (fileId) {
    return fileId;
  }

  // Create file if it doesn't exist
  const initialData = JSON.stringify({
    tasks: initialTasks,
    courses: initialCourses,
    groups: initialGroups,
  } as AppData);

  const metadata = {
    name: FILE_NAME,
    parents: ['appDataFolder'],
    mimeType: 'application/json',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([initialData], { type: 'application/json' }));

  const res = await fetch(`${DRIVE_UPLOAD_URL}/files?uploadType=multipart`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!res.ok) {
    throw new Error('Failed to create file in Google Drive');
  }

  const data = await res.json();
  return data.id;
}


export async function readDataFile(accessToken: string, fileId: string): Promise<AppData | null> {
  try {
    const res = await fetch(`${DRIVE_API_URL}/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
        if (res.status === 404) return null; // File not found is a valid case
        throw new Error(`Failed to read file from Google Drive. Status: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Error reading file from Google Drive:', error);
    return null;
  }
}

export async function writeDataFile(accessToken: string, fileId: string, data: AppData) {
    const content = JSON.stringify(data);

    await fetch(`${DRIVE_UPLOAD_URL}/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: content,
    });
}
