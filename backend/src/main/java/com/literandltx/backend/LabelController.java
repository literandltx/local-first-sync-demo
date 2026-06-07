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
    public ResponseEntity<LabelResponseDto> createLabel(@RequestBody LabelCreateRequestDto request) {
        LabelResponseDto createdLabel = labelService.createLabel(request);
        return new ResponseEntity<>(createdLabel, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<LabelResponseDto>> getAllLabels(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime updatedAfter) {

        if (updatedAfter != null) {
            List<LabelResponseDto> updatedLabels = labelService.getLabelsUpdatedAfter(updatedAfter.toLocalDateTime());
            return ResponseEntity.ok(updatedLabels);
        }

        List<LabelResponseDto> labels = labelService.getAllLabels();
        return ResponseEntity.ok(labels);
    }

    @GetMapping("/{id}")
    public ResponseEntity<LabelResponseDto> getLabelById(@PathVariable UUID id) {
        LabelResponseDto label = labelService.getLabelById(id);
        return ResponseEntity.ok(label);
    }

    @PutMapping("/{id}")
    public ResponseEntity<LabelResponseDto> updateLabel(@PathVariable UUID id, @RequestBody LabelUpdateRequestDto request) {
        LabelResponseDto updatedLabel = labelService.updateLabel(id, request);
        return ResponseEntity.ok(updatedLabel);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLabel(@PathVariable UUID id) {
        labelService.deleteLabel(id);
        return ResponseEntity.noContent().build();
    }
}
