
/**
 * Converts a Video or Audio File to a compact WAV Blob (mono, 16 kHz).
 *
 * Gemini recomienda audio mono a 16 kHz. Re-muestrear a este formato reduce
 * el tamaño del audio ~6-12x respecto al original (estéreo 44/48 kHz), lo que
 * evita reventar la memoria del navegador y permite enviar archivos largos.
 *
 * Supports video formats (MP4, MOV, etc.) and audio formats (MP3, WAV, etc.)
 */
export async function extractAudioFromVideo(file: File): Promise<{ blob: Blob; duration: number }> {
  const TARGET_SAMPLE_RATE = 16000; // 16 kHz, recomendado por Gemini
  const TARGET_CHANNELS = 1; // mono

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

  let decoded: AudioBuffer;
  try {
    const arrayBuffer = await file.arrayBuffer();
    // Decode the video/audio file to get raw audio data
    decoded = await audioContext.decodeAudioData(arrayBuffer);
  } catch (err) {
    await audioContext.close().catch(() => {});
    throw new Error(
      "No se pudo leer el audio del archivo. Si es muy grande (varios GB) puede agotar la memoria del navegador; intenta comprimirlo o recortarlo antes de subirlo."
    );
  }

  const duration = decoded.duration;
  await audioContext.close().catch(() => {});

  // Re-muestrear a mono 16 kHz usando un contexto offline.
  const offline = new OfflineAudioContext(
    TARGET_CHANNELS,
    Math.max(1, Math.ceil(duration * TARGET_SAMPLE_RATE)),
    TARGET_SAMPLE_RATE
  );
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();

  // Liberar el buffer original cuanto antes
  (decoded as any) = null;

  const wavBlob = audioBufferToWav(rendered);

  return { blob: wavBlob, duration };
}

/**
 * A simple helper to convert AudioBuffer to WAV format (16-bit PCM).
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952);                         // "RIFF"
  setUint32(length - 8);                         // file length - 8
  setUint32(0x45564157);                         // "WAVE"

  setUint32(0x20746d66);                         // "fmt " chunk
  setUint32(16);                                 // length = 16
  setUint16(1);                                  // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2);                      // block-align
  setUint16(16);                                 // 16-bit (hardcoded)

  setUint32(0x61746164);                         // "data" - chunk
  setUint32(length - pos - 4);                   // chunk length

  // write interleaved data
  for (i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {             // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF) | 0; // scale to 16-bit signed int
      view.setInt16(pos, sample, true);          // update data chunk
      pos += 2;
    }
    offset++;                                     // next source sample
  }

  return new Blob([bufferArray], { type: 'audio/wav' });

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}
