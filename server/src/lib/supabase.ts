import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

// Service role client — used server-side only, bypasses RLS
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
	auth: { persistSession: false },
});

// Storage bucket names
export const STORAGE_BUCKETS = {
	dogs: 'dog-images',
	litters: 'litter-media',
	updates: 'update-media',
	documents: 'client-documents',
	healthCerts: 'health-certs',
} as const;

export async function uploadFile(
	bucket: string,
	path: string,
	file: Blob,
	contentType: string
): Promise<string> {
	const { data, error } = await supabase.storage
		.from(bucket)
		.upload(path, file, { contentType, upsert: true });

	if (error) throw new Error(`Storage upload failed: ${error.message}`);

	const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
	return urlData.publicUrl;
}
