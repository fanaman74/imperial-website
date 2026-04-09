'use client';

import { useParams } from 'next/navigation';
import MenuItemForm from '../MenuItemForm';

export default function EditMenuItemPage() {
  const params = useParams();
  const itemId = params.itemId as string;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display text-accent">Edit Menu Item</h1>
      <MenuItemForm itemId={itemId} />
    </div>
  );
}
