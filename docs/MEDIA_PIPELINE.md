# Media Pipeline

FFmpeg assembles generated tracks into a single full-album MP4 in the worker. The render creates a manifest, concatenates every generated audio track, and pairs the sequence with a stable 1080p visual bed.

Chapter timestamps must be calculated from final assembled audio, not requested durations.

Original source audio should be preserved.
