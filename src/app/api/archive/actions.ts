"use server";

import { ArchiveCreateSchema, ArchiveUpdateSchema } from "app-types/archive";

export async function createArchiveAction(data: {
  name: string;
  description?: string;
}) {
  const _validatedData = ArchiveCreateSchema.parse(data);
  return { success: true };
}

export async function updateArchiveAction(
  _id: string,
  data: { name?: string; description?: string },
) {
  const _validatedData = ArchiveUpdateSchema.parse(data);
  return { success: true };
}

export async function deleteArchiveAction(_id: string) {
  return { success: true };
}

export async function addItemToArchiveAction(
  _archiveId: string,
  _itemId: string,
) {
  return { success: true };
}

export async function removeItemFromArchiveAction(
  _archiveId: string,
  _itemId: string,
) {
  return { success: true };
}

export async function getItemArchivesAction(_itemId: string) {
  return [];
}
