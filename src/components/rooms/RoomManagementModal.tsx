import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../i18n';
import { useApp } from '../../context/AppContext';
import { Room, RoomStatus, Tenant } from '../../types';
import { formatCurrency } from '../../utils/currencyUtils';
import {
  X,
  Plus,
  Home,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Trash2,
  Edit2,
  User,
  Filter,
  DollarSign
} from 'lucide-react';

interface RoomManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssignTenant?: (roomNumber: string) => void;
  onViewTenant?: (tenant: Tenant) => void;
}

const isOccupied = (status?: string) => status?.toLowerCase() === 'occupied';
const isVacant = (status?: string) => status?.toLowerCase() === 'vacant';
const isMaintenance = (status?: string) => status?.toLowerCase() === 'maintenance' || status?.toUpperCase() === 'RESERVED';

export const RoomManagementModal: React.FC<RoomManagementModalProps> = ({
  isOpen,
  onClose,
  onAssignTenant,
  onViewTenant
}) => {
  const { t, language } = useLanguage();
  const { rooms, tenants, createRoom, updateRoom, deleteRoom } = useApp();

  const [statusFilter, setStatusFilter] = useState<'all' | 'occupied' | 'vacant' | 'maintenance'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Form states for creating / editing
  const [formRoomNumber, setFormRoomNumber] = useState('');
  const [formFloor, setFormFloor] = useState('Ground Floor');
  const [formBaseRent, setFormBaseRent] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<RoomStatus>('vacant');
  const [formError, setFormError] = useState('');

  // Reset form
  const resetForm = () => {
    setFormRoomNumber('');
    setFormFloor('Ground Floor');
    setFormBaseRent('');
    setFormNotes('');
    setFormStatus('vacant');
    setFormError('');
    setShowAddModal(false);
    setEditingRoom(null);
  };

  const handleOpenEdit = (room: Room) => {
    setEditingRoom(room);
    setFormRoomNumber(room.roomNumber);
    setFormFloor(room.floor || 'Ground Floor');
    const rent = room.baseRent || room.monthlyRentDefault;
    setFormBaseRent(rent ? String(rent) : '');
    setFormNotes(room.notes || '');
    setFormStatus(room.status);
    setFormError('');
    setShowAddModal(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRoomNumber.trim()) {
      setFormError(language === 'gu' ? 'રૂમ નંબર દાખલ કરવો જરૂરી છે' : 'Room number is required');
      return;
    }

    // Check duplicate room number
    const isDup = rooms.some(
      (r) => r.roomNumber.toLowerCase() === formRoomNumber.trim().toLowerCase() && (!editingRoom || r.id !== editingRoom.id)
    );
    if (isDup) {
      setFormError(language === 'gu' ? 'આ રૂમ નંબર પહેલેથી અસ્તિત્વમાં છે' : 'Room number already exists');
      return;
    }

    try {
      const rentNumber = formBaseRent ? Number(formBaseRent) : undefined;
      if (editingRoom) {
        await updateRoom({
          ...editingRoom,
          roomNumber: formRoomNumber.trim(),
          floor: formFloor.trim(),
          baseRent: rentNumber,
          monthlyRentDefault: rentNumber,
          status: isOccupied(editingRoom.status) ? editingRoom.status : formStatus,
          notes: formNotes.trim()
        });
      } else {
        await createRoom({
          roomNumber: formRoomNumber.trim(),
          floor: formFloor.trim(),
          baseRent: rentNumber,
          monthlyRentDefault: rentNumber,
          status: formStatus,
          notes: formNotes.trim()
        });
      }
      resetForm();
    } catch (err) {
      console.error(err);
      setFormError('Failed to save room');
    }
  };

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'occupied') return isOccupied(r.status);
      if (statusFilter === 'vacant') return isVacant(r.status);
      if (statusFilter === 'maintenance') return isMaintenance(r.status);
      return true;
    });
  }, [rooms, statusFilter]);

  // Counts
  const counts = useMemo(() => {
    const total = rooms.length;
    const occupied = rooms.filter((r) => isOccupied(r.status)).length;
    const vacant = rooms.filter((r) => isVacant(r.status)).length;
    const maintenance = rooms.filter((r) => isMaintenance(r.status)).length;
    return { total, occupied, vacant, maintenance };
  }, [rooms]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-modal overflow-hidden my-6 border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-600 text-white">
              <Home className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                {language === 'gu' ? 'રૂમ અને યુનિટ સંચાલન' : 'Room & Unit Management'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {counts.total} {language === 'gu' ? 'કુલ રૂમ' : 'total units'} • {counts.occupied} {language === 'gu' ? 'ભરાયેલ' : 'occupied'} • {counts.vacant} {language === 'gu' ? 'ખાલી' : 'vacant'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'gu' ? 'નવો રૂમ' : 'Add Room'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="px-5 py-2.5 bg-slate-50/40 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto">
          {[
            { key: 'all', label: language === 'gu' ? 'બધા' : 'All', count: counts.total },
            { key: 'occupied', label: language === 'gu' ? 'ભરાયેલ' : 'Occupied', count: counts.occupied, color: 'text-blue-700' },
            { key: 'vacant', label: language === 'gu' ? 'ખાલી' : 'Vacant', count: counts.vacant, color: 'text-emerald-700' },
            { key: 'maintenance', label: language === 'gu' ? 'રિપેરિંગ' : 'Maintenance', count: counts.maintenance, color: 'text-amber-700' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                statusFilter === tab.key
                  ? 'bg-white shadow-xs text-slate-900 border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Modal Content - Rooms Grid */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {filteredRooms.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Home className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold">{language === 'gu' ? 'કોઈ રૂમ મળ્યો નથી' : 'No rooms found'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredRooms.map((room) => {
                const occupant = tenants.find((t) => t.id === room.currentTenantId && !t.isArchived);

                return (
                  <div
                    key={room.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Room Top Row */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-base text-slate-900">
                            Room #{room.roomNumber}
                          </span>
                          {room.floor && (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {room.floor}
                            </span>
                          )}
                        </div>

                        {/* Room Status Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isOccupied(room.status)
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : isVacant(room.status)
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isOccupied(room.status) ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{language === 'gu' ? 'ભરાયેલ' : 'Occupied'}</span>
                            </>
                          ) : isVacant(room.status) ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{language === 'gu' ? 'ખાલી' : 'Vacant'}</span>
                            </>
                          ) : (
                            <>
                              <Wrench className="w-3 h-3 text-amber-600" />
                              <span>{language === 'gu' ? 'રિપેરિંગ' : 'Maintenance'}</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Rent & Info */}
                      <div className="text-xs text-slate-500 space-y-1 mb-3">
                        {(room.baseRent || room.monthlyRentDefault) && (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">{language === 'gu' ? 'મૂળ ભાડું:' : 'Rent:'}</span>
                            <span className="font-bold text-slate-800">{formatCurrency(room.baseRent || room.monthlyRentDefault || 0)}/mo</span>
                          </div>
                        )}

                        {/* Occupant Info */}
                        {isOccupied(room.status) && occupant ? (
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between mt-2">
                            <div className="min-w-0">
                              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                                {language === 'gu' ? 'વર્તમાન ભાડુઆત' : 'Current Occupant'}
                              </span>
                              <span className="font-bold text-xs text-slate-900 truncate block">
                                {occupant.name} ({occupant.tenantCode || 'TEN-0000'})
                              </span>
                            </div>
                            {onViewTenant && (
                              <button
                                onClick={() => onViewTenant(occupant)}
                                className="text-[11px] font-bold text-blue-600 hover:underline shrink-0"
                              >
                                {language === 'gu' ? 'વિગત' : 'View'}
                              </button>
                            )}
                          </div>
                        ) : isVacant(room.status) ? (
                          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                            {language === 'gu' ? 'નવા ભાડુઆત માટે ઉપલબ્ધ' : 'Ready for move-in'}
                          </div>
                        ) : null}

                        {room.notes && (
                          <p className="text-[11px] text-slate-400 italic pt-1">{room.notes}</p>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(room)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Edit Room"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {!isOccupied(room.status) && (
                          <button
                            onClick={async () => {
                              if (confirm(`Delete Room #${room.roomNumber}?`)) {
                                await deleteRoom(room.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Room"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Quick Assign Button if Vacant */}
                      {isVacant(room.status) && onAssignTenant && (
                        <button
                          onClick={() => {
                            onClose();
                            onAssignTenant(room.roomNumber);
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all"
                        >
                          {language === 'gu' ? 'ભાડુઆત જોડો' : 'Assign Tenant'}
                        </button>
                      )}

                      {/* Toggle Maintenance if not occupied */}
                      {!isOccupied(room.status) && (
                        <button
                          onClick={async () => {
                            const newStatus: RoomStatus = isMaintenance(room.status) ? 'vacant' : 'maintenance';
                            await updateRoom({ ...room, status: newStatus });
                          }}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                        >
                          {isMaintenance(room.status) ? (language === 'gu' ? 'ખાલી કરો' : 'Mark Vacant') : (language === 'gu' ? 'રિપેરિંગમાં મૂકો' : 'Maintenance')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add / Edit Room Sub-Modal Overlay */}
        {showAddModal && (
          <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-modal p-5 border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="font-extrabold text-base text-slate-900">
                  {editingRoom ? (language === 'gu' ? 'રૂમ સુધારો' : 'Edit Room') : (language === 'gu' ? 'નવો રૂમ ઉમેરો' : 'Add New Room')}
                </h4>
                <button onClick={resetForm} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveRoom} className="space-y-3.5 pt-3">
                {formError && (
                  <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg font-medium">{formError}</p>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'gu' ? 'રૂમ નંબર' : 'Room / Unit Number'} *
                  </label>
                  <input
                    type="text"
                    value={formRoomNumber}
                    onChange={(e) => setFormRoomNumber(e.target.value)}
                    placeholder="101"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {language === 'gu' ? 'માળ' : 'Floor'}
                    </label>
                    <input
                      type="text"
                      value={formFloor}
                      onChange={(e) => setFormFloor(e.target.value)}
                      placeholder="Ground / 1st"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {language === 'gu' ? 'અપેક્ષિત ભાડું (₹)' : 'Base Rent (₹)'}
                    </label>
                    <input
                      type="number"
                      value={formBaseRent}
                      onChange={(e) => setFormBaseRent(e.target.value)}
                      placeholder="6000"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {(!editingRoom || !isOccupied(editingRoom.status)) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {language === 'gu' ? 'સ્થિતિ' : 'Status'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['vacant', 'maintenance'] as RoomStatus[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setFormStatus(st)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                            formStatus === st
                              ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          {st === 'vacant' ? (language === 'gu' ? 'ખાલી' : 'Vacant') : (language === 'gu' ? 'રિપેરિંગ' : 'Maintenance')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'gu' ? 'નોંધ' : 'Notes'}
                  </label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="e.g. Attached bathroom, AC unit"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20"
                  >
                    {language === 'gu' ? 'સાચવો' : 'Save Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
