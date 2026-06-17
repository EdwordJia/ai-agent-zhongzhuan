export async function generateImage(
  channel: { gateway_url: string; api_key: string | null; model: string },
  params: { prompt: string; n: number; size?: string; quality?: string; outputFormat?: string; background?: string }
) {
  try {
    const body: any = {
      model: channel.model,
      prompt: params.prompt,
      n: params.n
    };
    if (params.size) body.size = params.size;
    if (params.quality) body.quality = params.quality;
    if (params.outputFormat) body.output_format = params.outputFormat;
    if (params.background) body.background = params.background;
    const res = await fetch(channel.gateway_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${channel.api_key || ''}`
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text();
      return { success: false, message: `网关错误 ${res.status}: ${text}` };
    }
    const data = await res.json() as { data?: Array<{ url?: string; b64_json?: string }> };
    const images: string[] = [];
    if (data.data && Array.isArray(data.data)) {
      for (const item of data.data) {
        if (item.url) images.push(item.url);
        else if (item.b64_json) images.push(`data:image/png;base64,${item.b64_json}`);
      }
    }
    if (images.length === 0) {
      return { success: false, message: '网关返回数据中没有图片' };
    }
    return { success: true, images };
  } catch (err: any) {
    return { success: false, message: err.message || '请求网关失败' };
  }
}
