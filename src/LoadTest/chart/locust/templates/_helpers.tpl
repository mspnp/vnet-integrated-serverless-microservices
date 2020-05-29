{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "locust.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "locust.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "locust.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "locust.labels" -}}
helm.sh/chart: {{ include "locust.chart" . }}
{{ include "locust.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/*
Selector labels
*/}}
{{- define "locust.selectorLabels" -}}
app.kubernetes.io/name: {{ include "locust.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Locust command line options
*/}}

{{- define "locust.master.locustOpts" -}}
{{- if .Values.master.config.locustOpts -}}
  {{ .Values.master.config.locustOpts }}
{{- else -}}
  {{- if eq .Values.master.component.web.enabled false -}}
    {{ printf " --no-web --expect-slaves %.0f --clients %.0f --hatch-rate %.0f --run-time %s --csv /locust-results/results" .Values.worker.replicaCount .Values.locust.clients .Values.locust.hatchRate .Values.locust.runTime }}
    {{- if eq .Values.locust.stepLoad.enabled true -}}
      {{ printf "--step-load --step-clients %.0f --step-time %s" .Values.locust.stepLoad.clients .Values.locust.stepLoad.stepTime }}
    {{- end -}}
  {{- end -}}
  {{- printf " --loglevel %s" .Values.locust.logLevel -}}
{{- end -}}
{{- end -}}

{{- define "locust.worker.locustOpts" -}}
{{- if .Values.worker.config.locustOpts -}}
  {{ .Values.worker.config.locustOpts }}
{{- else -}}
  {{ printf "--loglevel %s" .Values.locust.logLevel }}
{{- end -}}
{{- end -}}
