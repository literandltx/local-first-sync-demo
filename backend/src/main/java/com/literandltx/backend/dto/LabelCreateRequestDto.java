package com.literandltx.backend.dto;

import java.util.UUID;

public record LabelCreateRequestDto(
    UUID uuid, // Required from the client for local-first creation
    String name,
    String color
) {}