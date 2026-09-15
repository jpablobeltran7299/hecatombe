// Formulario de alta/edición de una dirección de envío guardada.
export default function FormDireccion({ form, setForm, onGuardar, onCancelar, guardando, inputClass, labelClass }) {
  if (!form) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Nombre *</label>
          <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Apellido *</label>
          <input type="text" value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} placeholder="Apellido" className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Teléfono *</label>
          <input type="tel" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="Tu número de teléfono" className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Calle y número *</label>
          <input type="text" value={form.calle} onChange={e => setForm({ ...form, calle: e.target.value })} placeholder="Ej. Av. Constituyentes 123" className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Colonia *</label>
          <input type="text" value={form.colonia} onChange={e => setForm({ ...form, colonia: e.target.value })} placeholder="Nombre de tu colonia" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Ciudad *</label>
          <input type="text" value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} placeholder="Tu ciudad" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Estado *</label>
          <input type="text" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} placeholder="Tu estado" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Código postal *</label>
          <input type="text" value={form.cp} onChange={e => setForm({ ...form, cp: e.target.value })} placeholder="CP" className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Referencias <span className="normal-case font-normal opacity-60">(opcional)</span></label>
          <textarea value={form.referencias || ''} onChange={e => setForm({ ...form, referencias: e.target.value })} placeholder="Ej. Casa azul, portón negro" rows={2} className={`${inputClass} resize-none`} />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onGuardar} disabled={guardando}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black uppercase py-3 px-6 rounded-xl transition text-sm">
          {guardando ? 'Guardando...' : 'Guardar dirección'}
        </button>
        <button onClick={onCancelar}
          className="text-ink/50 hover:text-ink font-black uppercase py-3 px-6 rounded-xl transition text-sm">
          Cancelar
        </button>
      </div>
    </div>
  )
}
