'use client'

import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, rectSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function ImagenSortable({ item, onEliminar }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className="relative cursor-grab active:cursor-grabbing touch-none">
      <img src={item.previewUrl} alt="" className="w-20 h-20 object-contain rounded-xl bg-white" />
      <button
        onClick={(e) => { e.stopPropagation(); onEliminar(item.key) }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-black">
        ✕
      </button>
    </div>
  )
}

export default function ImagenesOrdenables({ imagenes, onReordenar, onEliminar }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = imagenes.findIndex(img => img.key === active.id)
    const newIndex = imagenes.findIndex(img => img.key === over.id)
    onReordenar(arrayMove(imagenes, oldIndex, newIndex))
  }

  if (imagenes.length === 0) return null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={imagenes.map(img => img.key)} strategy={rectSortingStrategy}>
        <div className="flex flex-wrap gap-3">
          {imagenes.map(img => (
            <ImagenSortable key={img.key} item={img} onEliminar={onEliminar} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
