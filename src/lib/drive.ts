
'use server';

import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import type { AppData } from './types';
import { initialCourses, initialGroups, initialTasks } from './data';

const FILE_NAME = 'courseflow-data.json';
const FILE_MIME_TYPE = 'application/json';

async function getDriveClient() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    throw new Error('No access token found. Please sign in.');
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: session.accessToken });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function findOrCreateDataFile() {
  const drive = await getDriveClient();
  
  // Search for the file in the appDataFolder
  const res = await drive.files.list({
    q: `name='${FILE_NAME}' and mimeType='${FILE_MIME_TYPE}' and 'appDataFolder' in parents`,
    fields: 'files(id, name)',
    spaces: 'appDataFolder',
  });

  const existingFile = res.data.files?.[0];

  if (existingFile?.id) {
    return existingFile.id;
  } else {
    // Create the file in the appDataFolder
    const fileMetadata = {
      name: FILE_NAME,
      parents: ['appDataFolder'],
    };
    const media = {
      mimeType: FILE_MIME_TYPE,
      body: JSON.stringify({ tasks: initialTasks, courses: initialCourses, groups: initialGroups } as AppData),
    };
    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id',
    });
    return file.data.id!;
  }
}

export async function readDataFile(fileId: string): Promise<AppData | null> {
    const drive = await getDriveClient();
    try {
        const res = await drive.files.get({
            fileId: fileId,
            alt: 'media',
        });
        // The type from googleapis is not precise, so we cast to unknown first
        return res.data as unknown as AppData;
    } catch (error) {
        console.error('Error reading file from Google Drive:', error);
        return null;
    }
}

export async function writeDataFile(fileId: string, data: AppData) {
    const drive = await getDriveClient();
    const media = {
        mimeType: FILE_MIME_TYPE,
        body: JSON.stringify(data),
    };
    await drive.files.update({
        fileId: fileId,
        media: media,
    });
}
