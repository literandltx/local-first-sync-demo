package com.literandltx.backend;

import com.literandltx.backend.dto.LabelCreateRequestDto;
import com.literandltx.backend.dto.LabelUpdateRequestDto;
import com.literandltx.backend.dto.LabelResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
public class LabelService {

    private final LabelRepository labelRepository;

    public LabelService(LabelRepository labelRepository) {
        this.labelRepository = labelRepository;
    }

    public LabelResponseDto createLabel(LabelCreateRequestDto request) {
        log.info("Creating new label with name: '{}' and UUID: {}", request.name(), request.uuid());

        Label label = new Label();
        label.setUuid(request.uuid());
        label.setName(request.name());
        label.setColor(request.color());
        label.setCreatedAt(request.createdAt());
        label.setUpdatedAt(request.updatedAt());

        Label savedLabel = labelRepository.save(label);
        log.debug("Successfully saved label to database with UUID: {}", savedLabel.getUuid());

        return mapToResponse(savedLabel);
    }

    public List<LabelResponseDto> getAllLabels() {
        log.debug("Fetching all labels from the database");

        List<Label> labels = labelRepository.findAll();
        log.info("Retrieved {} total labels", labels.size());

        return labels.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<LabelResponseDto> getLabelsUpdatedAfter(LocalDateTime updatedAfter) {
        log.info("Fetching labels updated after: {}", updatedAfter);

        List<Label> labels = labelRepository.findByUpdatedAtAfter(updatedAfter);
        log.debug("Found {} labels updated after the requested timestamp", labels.size());

        return labels.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public LabelResponseDto getLabelById(UUID id) {
        log.debug("Fetching label by ID: {}", id);

        Label label = labelRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Failed to find label. No label exists with ID: {}", id);
                    return new RuntimeException("Label not found with id: " + id);
                });

        return mapToResponse(label);
    }

    public LabelResponseDto updateLabel(UUID id, LabelUpdateRequestDto request) {
        log.info("Attempting to update label with ID: {}", id);

        Label existingLabel = labelRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Failed to update. No label exists with ID: {}", id);
                    return new RuntimeException("Label not found with id: " + id);
                });

        existingLabel.setName(request.name());
        existingLabel.setColor(request.color());

        if (request.updatedAt() != null) {
            existingLabel.setUpdatedAt(request.updatedAt());
        } else {
            existingLabel.setUpdatedAt(LocalDateTime.now());
        }

        Label updatedLabel = labelRepository.save(existingLabel);
        log.debug("Successfully updated label with ID: {}", updatedLabel.getUuid());

        return mapToResponse(updatedLabel);
    }

    public void deleteLabel(UUID id) {
        log.info("Attempting to delete label with ID: {}", id);

        if (!labelRepository.existsById(id)) {
            log.warn("Label with ID {} does not exist. Ignoring delete request.", id);
            return;
        }

        labelRepository.deleteById(id);
        log.info("Successfully deleted label with ID: {}", id);
    }

    private LabelResponseDto mapToResponse(Label label) {
        return new LabelResponseDto(
                label.getUuid(),
                label.getName(),
                label.getColor(),
                label.getCreatedAt(),
                label.getUpdatedAt()
        );
    }
}
