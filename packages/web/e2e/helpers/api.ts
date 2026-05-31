const API_BASE = 'http://localhost:3000/api/v1';

export type MemberDTO = {
    id: string;
    name: string;
    dni: string;
    email: string;
    status: string;
};

export async function createMember(data: {
    name: string;
    dni: string;
    email: string;
    category?: 'Pleno' | 'Cadete' | 'Honorario';
}): Promise<MemberDTO> {
    const res = await fetch(`${API_BASE}/socios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...data,
            category: data.category ?? 'Pleno',
            birthdate: '1990-01-01',
        }),
    });
    if (!res.ok) throw new Error(`Error creando socio: ${res.status} - ${await res.text()}`);
    const json = await res.json();
    return json.data;
}