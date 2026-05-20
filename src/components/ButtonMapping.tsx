import React from 'react';
import { useConfigStore } from '../state/configStore';
import { Zap, Power } from 'lucide-react';

export const ButtonMapping: React.FC = () => {
  const { sections, updateParam } = useConfigStore();
  
  // Find buttons sections
  const onSection = sections.find(s => s.name.toLowerCase() === 'buttons_on');
  const offSection = sections.find(s => s.name.toLowerCase() === 'buttons_off');
  
  const onIndex = sections.findIndex(s => s.name.toLowerCase() === 'buttons_on');
  const offIndex = sections.findIndex(s => s.name.toLowerCase() === 'buttons_off');

  if (sections.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text)' }}>No configuration loaded.</div>;
  }

  // Physical Slot Definitions (from button_profiles.h)
  const SLOTS = [
    { id: 0, label: 'Power Click' },
    { id: 1, label: 'Power Long Click' },
    { id: 2, label: 'Power Hold' },
    { id: 3, label: 'Power Long Hold' },
    { id: 4, label: 'Power Double Click' },
    { id: 23, label: 'Power Med Hold' },
    { id: 5, label: 'Aux Click' },
    { id: 6, label: 'Aux Long Click' },
    { id: 7, label: 'Aux Hold' },
    { id: 8, label: 'Aux Long Hold' },
    { id: 9, label: 'Aux Double Click' },
    { id: 10, label: 'Power+Aux Hold' },
    { id: 12, label: 'Power+Aux Click' },
    { id: 30, label: 'Twist (Power Mod)' },
    { id: 31, label: 'Stab (Power Mod)' },
    { id: 32, label: 'Swing (Power Mod)' },
  ];

  const ACTIONS = [
    'none', 'on', 'off', 'blast', 'clash', 'lockup', 'drag', 'melt', 'lightning_block',
    'force', 'stab', 'color_change', 'next_preset', 'prev_preset', 'volume_up', 'volume_down',
    'track_player', 'battery_level', 'quote', 'on_or_volume_up', 'next_preset_or_volume_down',
    'prev_preset_if_not_volume_menu', 'activate_muted', 'toggle_volume_menu', 
    'toggle_battle_mode', 'toggle_multi_blast', 'force_or_color_change', 'lockup_or_drag'
  ];

  return (
    <div className="button-mapping" style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
        <Zap size={24} color="var(--accent)" />
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Button & Gesture Assignments</h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
        
        {/* SABER OFF Column */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: 'var(--text)' }}>
            <Power size={18} />
            <h4 style={{ margin: 0, fontSize: '14px', textTransform: 'uppercase', fontWeight: 600 }}>Saber is OFF</h4>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr style={{ color: 'var(--text)', fontSize: '12px', textAlign: 'left' }}>
                <th style={{ padding: '0 10px' }}>Physical Event</th>
                <th style={{ padding: '0 10px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {SLOTS.map(slot => (
                <tr key={`off-${slot.id}`} style={{ background: 'var(--bg)', borderRadius: '8px' }}>
                  <td style={{ padding: '12px 15px', border: '1px solid var(--border)', borderRight: 'none', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px', fontWeight: 500, fontSize: '14px' }}>
                    {slot.label}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid var(--border)', borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}>
                    <select 
                      value={offSection?.params[`slot_${slot.id}`] || 'none'}
                      onChange={(e) => updateParam(offIndex, `slot_${slot.id}`, e.target.value)}
                      style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--accent)', fontWeight: 600 }}
                    >
                      {ACTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SABER ON Column */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: 'var(--accent)' }}>
            <Zap size={18} />
            <h4 style={{ margin: 0, fontSize: '14px', textTransform: 'uppercase', fontWeight: 600 }}>Saber is ON</h4>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr style={{ color: 'var(--text)', fontSize: '12px', textAlign: 'left' }}>
                <th style={{ padding: '0 10px' }}>Physical Event</th>
                <th style={{ padding: '0 10px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {SLOTS.map(slot => (
                <tr key={`on-${slot.id}`} style={{ background: 'var(--bg)', borderRadius: '8px' }}>
                  <td style={{ padding: '12px 15px', border: '1px solid var(--border)', borderRight: 'none', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px', fontWeight: 500, fontSize: '14px' }}>
                    {slot.label}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid var(--border)', borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}>
                    <select 
                      value={onSection?.params[`slot_${slot.id}`] || 'none'}
                      onChange={(e) => updateParam(onIndex, `slot_${slot.id}`, e.target.value)}
                      style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--accent)', fontWeight: 600 }}
                    >
                      {ACTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};
