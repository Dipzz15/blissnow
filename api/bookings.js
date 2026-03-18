import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    // For simplicity, no auth check here, but in production add
    if (req.method === 'GET') {
      const { user_id } = req.query;
      let query = supabase.from('bookings').select(`
        *,
        services (name, price),
        practitioners (name)
      `).order('appointment_time', { ascending: true });

      if (user_id) {
        query = query.eq('user_id', user_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { user_id, practitioner_id, service_id, appointment_time, credits_used } = req.body;
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          user_id,
          practitioner_id,
          service_id,
          appointment_time,
          status: 'confirmed',
          credits_used
        })
        .select(`
          *,
          services (name),
          practitioners (name)
        `)
        .single();
      if (error) throw error;

      // Deduct credits from profile
      await supabase
        .from('profiles')
        .update({ credits: supabase.raw(`credits - ${credits_used}`) })
        .eq('id', user_id);

      return res.status(201).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
