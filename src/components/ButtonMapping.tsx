import React from 'react';
import { useConfigStore } from '../state/configStore';
import { Zap, Power } from 'lucide-react';
import { BUTTON_ACTIONS, BUTTON_SLOTS, getButtonSlotAction } from './buttonMappingConfig';

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
              {BUTTON_SLOTS.map(slot => (
                <tr key={`off-${slot.id}`} style={{ background: 'var(--bg)', borderRadius: '8px' }}>
                  <td style={{ padding: '12px 15px', border: '1px solid var(--border)', borderRight: 'none', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px', fontWeight: 500, fontSize: '14px' }}>
                    {slot.label}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid var(--border)', borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}>
                    <select 
                      value={getButtonSlotAction(offSection?.params, slot.id)}
                      onChange={(e) => updateParam(offIndex, `slot_${slot.id}`, e.target.value)}
                      style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--accent)', fontWeight: 600 }}
                    >
                      {BUTTON_ACTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
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
              {BUTTON_SLOTS.map(slot => (
                <tr key={`on-${slot.id}`} style={{ background: 'var(--bg)', borderRadius: '8px' }}>
                  <td style={{ padding: '12px 15px', border: '1px solid var(--border)', borderRight: 'none', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px', fontWeight: 500, fontSize: '14px' }}>
                    {slot.label}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid var(--border)', borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}>
                    <select 
                      value={getButtonSlotAction(onSection?.params, slot.id)}
                      onChange={(e) => updateParam(onIndex, `slot_${slot.id}`, e.target.value)}
                      style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--accent)', fontWeight: 600 }}
                    >
                      {BUTTON_ACTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
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
