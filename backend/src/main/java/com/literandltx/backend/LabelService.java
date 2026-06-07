package com.literandltx.backend;

import com.literandltx.backend.dto.LabelCreateRequestDto;
import com.literandltx.backend.dto.LabelUpdateRequestDto;
import com.literandltx.backend.dto.LabelResponseDto;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class LabelService {

    private final LabelRepository labelRepository;

    public LabelService(LabelRepository labelRepository) {
        this.labelRepository = labelRepository;
    }

    public LabelResponseDto createLabel(LabelCreateRequestDto request) {
        Label label = new Label();
        label.setUuid(request.uuid());
        label.setName(request.name());
        label.setColor(request.color());
        label.setCreatedAt(request.createdAt());
        label.setUpdatedAt(request.updatedAt());

        Label savedLabel = labelRepository.save(label);
        return mapToResponse(savedLabel);
    }

    public List<LabelResponseDto> getAllLabels() {
        return labelRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public LabelResponseDto getLabelById(UUID id) {
        Label label = labelRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Label not found with id: " + id));
        return mapToResponse(label);
    }

    public LabelResponseDto updateLabel(UUID id, LabelUpdateRequestDto request) {
        Label existingLabel = labelRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Label not found with id: " + id));

        existingLabel.setName(request.name());
        existingLabel.setColor(request.color());

        if (request.updatedAt() != null) {
            existingLabel.setUpdatedAt(request.updatedAt());
        } else {
            existingLabel.setUpdatedAt(LocalDateTime.now());
        }

        Label updatedLabel = labelRepository.save(existingLabel);
        return mapToResponse(updatedLabel);
    }

    public void deleteLabel(UUID id) {
        Label existingLabel = labelRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Label not found with id: " + id));
        labelRepository.delete(existingLabel);
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
