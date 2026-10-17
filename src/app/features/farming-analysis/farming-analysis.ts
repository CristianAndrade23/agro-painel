import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FarmingApi } from '../../core/api/farming.api';
import { Producer, fullName } from '../../core/models';
import { Autocomplete } from '../../shared/autocomplete';
import { Icon } from '../../shared/icon';
import { ProducerFarmingsPanel } from './producer-farmings';

@Component({
  selector: 'app-farming-analysis',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Autocomplete, Icon, ProducerFarmingsPanel],
  templateUrl: './farming-analysis.html',
  styleUrl: './farming-analysis.css',
})
export default class FarmingAnalysis {
  private readonly api = inject(FarmingApi);

  protected readonly fullName = fullName;
  protected readonly producerLabel = (p: Producer) => fullName(p);

  protected readonly producers = rxResource({ stream: () => this.api.producers() });

  /** Produtores escolhidos na busca (chips) e o produtor em análise. */
  protected readonly picked = signal<Producer[]>([]);
  protected readonly activeId = signal<number | undefined>(undefined);

  protected readonly available = computed(() => {
    const picked = new Set(this.picked().map((p) => p.id));
    return (this.producers.value() ?? []).filter((p) => !picked.has(p.id));
  });

  protected readonly farmings = rxResource({
    params: () => this.activeId(),
    stream: ({ params: producerId }) => this.api.byProducer(producerId),
  });

  protected pick(producer: Producer) {
    this.picked.update((list) => [...list, producer]);
    this.activeId.set(producer.id);
  }

  protected remove(producer: Producer) {
    this.picked.update((list) => list.filter((p) => p.id !== producer.id));
    if (this.activeId() === producer.id) this.activeId.set(this.picked()[0]?.id);
  }
}
