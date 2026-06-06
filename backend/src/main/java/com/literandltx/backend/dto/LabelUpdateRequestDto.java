package com.literandltx.backend.dto;

public record LabelUpdateRequestDto(
    // No UUID here; it will be provided via the URL path in the controller
    String name,
    String color
) {}