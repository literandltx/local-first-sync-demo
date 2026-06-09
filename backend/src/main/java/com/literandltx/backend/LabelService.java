package com.literandltx.backend;

import com.literandltx.backend.dto.LabelCreateRequestDto;
import com.literandltx.backend.dto.LabelUpdateRequestDto;
import com.literandltx.backend.dto.LabelResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
public class LabelService {

    private final LabelRepository labelRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public LabelService(LabelRepository labelRepository, SimpMessagingTemplate messagingTemplate) {
        this.labelRepository = labelRepository;
        this.messagingTemplate = messagingTemplate;
    }

    public LabelResponseDto createLabel(LabelCreateRequestDto request, String userId) {
        log.info("Creating new label with name: '{}' and UUID: {} for user: {}", request.name(), request.uuid(), userId);

        Label label = new Label();
        label.setUuid(request.uuid());
        label.setName(request.name());
        label.setColor(request.color());
        label.setCreatedAt(request.createdAt());
        label.setUpdatedAt(request.updatedAt());
        label.setUserId(userId);

        Label savedLabel = labelRepository.save(label);
        log.debug("Successfully saved label to database with UUID: {}", savedLabel.getUuid());

        LabelResponseDto response = mapToResponse(savedLabel);
        broadcastUpdate(response, userId);
        return response;
    }

    public List<LabelResponseDto> getAllLabels(String userId) {
        log.debug("Fetching all active labels from the database");
        List<Label> labels = labelRepository.findByUserIdAndDeletedFalse(userId);
        return labels.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<LabelResponseDto> getLabelsUpdatedAfter(LocalDateTime updatedAfter, String userId) {
        log.info("Fetching delta updates after: {}", updatedAfter);
        List<Label> labels = labelRepository.findByUserIdAndUpdatedAtAfter(userId, updatedAfter);
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

    public LabelResponseDto updateLabel(UUID id, LabelUpdateRequestDto request, String userId) {
        log.info("Attempting to update label with ID: {} for user: {}", id, userId);

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

        LabelResponseDto response = mapToResponse(updatedLabel);
        broadcastUpdate(response, userId);
        return response;
    }

    public void deleteLabel(UUID id, String userId) {
        log.info("Attempting to soft-delete label with ID: {} for user: {}", id, userId);

        labelRepository.findById(id).ifPresentOrElse(label -> {
            label.setDeleted(true);
            label.setUpdatedAt(LocalDateTime.now());
            Label savedLabel = labelRepository.save(label);

            broadcastUpdate(mapToResponse(savedLabel), userId);
            log.info("Successfully soft-deleted label with ID: {}", id);
        }, () -> log.warn("Label with ID {} does not exist. Ignoring.", id));
    }

    private LabelResponseDto mapToResponse(Label label) {
        return new LabelResponseDto(
                label.getUuid(),
                label.getName(),
                label.getColor(),
                label.getCreatedAt(),
                label.getUpdatedAt(),
                label.isDeleted()
        );
    }

    private void broadcastUpdate(LabelResponseDto label, String userId) {
        log.debug("Broadcasting label update to user {}: {}", userId, label.uuid());
        messagingTemplate.convertAndSendToUser(userId, "/queue/labels", label);
    }
}
