package com.literandltx.backend.dto;

import java.time.LocalDateTime;

public record LabelUpdateRequestDto(
        String name,
        String color,
        LocalDateTime updatedAt
) {}
