package com.literandltx.backend;

import com.literandltx.backend.dto.LabelCreateRequestDto;
import com.literandltx.backend.dto.LabelUpdateRequestDto;
import com.literandltx.backend.dto.LabelResponseDto;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/labels")
public class LabelController {

    private final LabelService labelService;

    public LabelController(LabelService labelService) {
        this.labelService = labelService;
    }

    @PostMapping
    public ResponseEntity<LabelResponseDto> createLabel(
            @RequestHeader(value = "X-User-Id", defaultValue = "unknown") String userId,
            @RequestBody LabelCreateRequestDto request
    ) {
        LabelResponseDto createdLabel = labelService.createLabel(request, userId);
        return new ResponseEntity<>(createdLabel, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<LabelResponseDto>> getAllLabels(
            @RequestHeader(value = "X-User-Id", defaultValue = "unknown") String userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime updatedAfter
    ) {
        if (updatedAfter != null) {
            List<LabelResponseDto> updatedLabels = labelService.getLabelsUpdatedAfter(updatedAfter.toLocalDateTime(), userId);
            return ResponseEntity.ok(updatedLabels);
        }

        List<LabelResponseDto> labels = labelService.getAllLabels(userId);
        return ResponseEntity.ok(labels);
    }

    @GetMapping("/{id}")
    public ResponseEntity<LabelResponseDto> getLabelById(
            @RequestHeader(value = "X-User-Id", defaultValue = "unknown") String userId,
            @PathVariable UUID id
    ) {
        LabelResponseDto label = labelService.getLabelById(id);
        return ResponseEntity.ok(label);
    }

    @PutMapping("/{id}")
    public ResponseEntity<LabelResponseDto> updateLabel(
            @RequestHeader(value = "X-User-Id", defaultValue = "unknown") String userId,
            @PathVariable UUID id, @RequestBody LabelUpdateRequestDto request
    ) {
        LabelResponseDto updatedLabel = labelService.updateLabel(id, request, userId);
        return ResponseEntity.ok(updatedLabel);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLabel(
            @RequestHeader(value = "X-User-Id", defaultValue = "unknown") String userId,
            @PathVariable UUID id
    ) {
        labelService.deleteLabel(id, userId);
        return ResponseEntity.noContent().build();
    }
}
